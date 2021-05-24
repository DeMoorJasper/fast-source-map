// @flow
import type { ParsedMap, VLQMap, SourceMapStringifyOptions, IndexedMapping, GenerateEmptyMapOptions } from './types';

import path from 'path';
import { generateInlineMap, partialVlqMapToSourceMap } from './utils';
import { version } from '../package.json';

export default class SourceMap {
  /**
   * @private
   */
  sourceMapInstance: any;

  /**
   * @private
   */
  projectRoot: string;

  /**
   * Construct a SourceMap instance
   *
   * @param projectRoot root directory of the project, this is to ensure all source paths are relative to this path
   */
  constructor(opts: string | Buffer = '/') {}

  // Use this to invalidate saved buffers, we don't check versioning at all in Rust
  get libraryVersion(): string {
    return version;
  }

  /**
   * Generates an empty map from the provided fileName and sourceContent
   *
   * @param sourceName path of the source file
   * @param sourceContent content of the source file
   * @param lineOffset an offset that gets added to the sourceLine index of each mapping
   */
  static generateEmptyMap({
    projectRoot,
    sourceName,
    sourceContent,
    lineOffset = 0,
  }: GenerateEmptyMapOptions): SourceMap {
    throw new Error('SourceMap.generateEmptyMap() must be implemented when extending SourceMap');
  }

  /**
   * Generates an empty map from the provided fileName and sourceContent
   *
   * @param sourceName path of the source file
   * @param sourceContent content of the source file
   * @param lineOffset an offset that gets added to the sourceLine index of each mapping
   */
  addEmptyMap(sourceName: string, sourceContent: string, lineOffset: number = 0): SourceMap {
    this.sourceMapInstance.addEmptyMap(sourceName, sourceContent, lineOffset);
    return this;
  }

  /**
   * Appends raw VLQ mappings to the sourcemaps
   */
  addVLQMap(map: VLQMap, lineOffset: number = 0, columnOffset: number = 0): SourceMap {
    throw new Error('SourceMap.addVLQMap() must be implemented when extending SourceMap');
  }

  /**
   * Appends another sourcemap instance to this sourcemap
   *
   * @param buffer the sourcemap buffer that should get appended to this sourcemap
   * @param lineOffset an offset that gets added to the sourceLine index of each mapping
   * @param columnOffset  an offset that gets added to the sourceColumn index of each mapping
   */
  addSourceMap(sourcemap: SourceMap, lineOffset: number = 0): SourceMap {
    throw new Error('Not implemented by child class');
  }

  /**
   * Appends a buffer to this sourcemap
   * Note: The buffer should be generated by this library
   * @param buffer the sourcemap buffer that should get appended to this sourcemap
   * @param lineOffset an offset that gets added to the sourceLine index of each mapping
   * @param columnOffset  an offset that gets added to the sourceColumn index of each mapping
   */
  addBuffer(buffer: Buffer, lineOffset: number = 0): SourceMap {
    throw new Error('Not implemented by child class');
  }

  /**
   * Appends a Mapping object to this sourcemap
   * Note: line numbers start at 1 due to mozilla's source-map library
   *
   * @param mapping the mapping that should be appended to this sourcemap
   * @param lineOffset an offset that gets added to the sourceLine index of each mapping
   * @param columnOffset  an offset that gets added to the sourceColumn index of each mapping
   */
  addIndexedMapping(mapping: IndexedMapping<string>, lineOffset?: number = 0, columnOffset?: number = 0): void {
    // Not sure if it'll be worth it to add this back to C++, wrapping it in an array probably doesn't do that much harm in JS?
    // Also we barely use this function anyway...
    this.addIndexedMappings([mapping], lineOffset, columnOffset);
  }

  _indexedMappingsToInt32Array(
    mappings: Array<IndexedMapping<string>>,
    lineOffset?: number = 0,
    columnOffset?: number = 0
  ): Int32Array {
    // Encode all mappings into a single typed array and make one call
    // to C++ instead of one for each mapping to improve performance.
    let mappingBuffer = new Int32Array(mappings.length * 6);
    let sources: Map<string, number> = new Map();
    let names: Map<string, number> = new Map();
    let i = 0;
    for (let mapping of mappings) {
      let hasValidOriginal =
        mapping.original &&
        typeof mapping.original.line === 'number' &&
        !isNaN(mapping.original.line) &&
        typeof mapping.original.column === 'number' &&
        !isNaN(mapping.original.column);

      mappingBuffer[i++] = mapping.generated.line + lineOffset - 1;
      mappingBuffer[i++] = mapping.generated.column + columnOffset;
      // $FlowFixMe
      mappingBuffer[i++] = hasValidOriginal ? mapping.original.line - 1 : -1;
      // $FlowFixMe
      mappingBuffer[i++] = hasValidOriginal ? mapping.original.column : -1;

      let sourceIndex = mapping.source ? sources.get(mapping.source) : -1;
      if (sourceIndex == null) {
        // $FlowFixMe
        sourceIndex = this.addSource(mapping.source);
        // $FlowFixMe
        sources.set(mapping.source, sourceIndex);
      }
      mappingBuffer[i++] = sourceIndex;

      let nameIndex = mapping.name ? names.get(mapping.name) : -1;
      if (nameIndex == null) {
        // $FlowFixMe
        nameIndex = this.addName(mapping.name);
        // $FlowFixMe
        names.set(mapping.name, nameIndex);
      }
      mappingBuffer[i++] = nameIndex;
    }

    return mappingBuffer;
  }

  /**
   * Appends an array of Mapping objects to this sourcemap
   * This is useful when improving performance if a library provides the non-serialised mappings
   *
   * Note: This is only faster if they generate the serialised map lazily
   * Note: line numbers start at 1 due to mozilla's source-map library
   *
   * @param mappings an array of mapping objects
   * @param lineOffset an offset that gets added to the sourceLine index of each mapping
   * @param columnOffset  an offset that gets added to the sourceColumn index of each mapping
   */
  addIndexedMappings(
    mappings: Array<IndexedMapping<string>>,
    lineOffset?: number = 0,
    columnOffset?: number = 0
  ): SourceMap {
    throw new Error('Should be implemented by child class');
  }

  /**
   * Appends a name to the sourcemap
   *
   * @param name the name that should be appended to the names array
   * @returns the index of the added name in the names array
   */
  addName(name: string): number {
    return this.sourceMapInstance.addName(name);
  }

  /**
   * Appends an array of names to the sourcemap's names array
   *
   * @param names an array of names to add to the sourcemap
   * @returns an array of indexes of the names in the sourcemap's names array, has the same order as the provided names array
   */
  addNames(names: Array<string>): Array<number> {
    return names.map((n) => this.addName(n));
  }

  /**
   * Appends a source to the sourcemap's sources array
   *
   * @param source a filepath that should be appended to the sources array
   * @returns the index of the added source filepath in the sources array
   */
  addSource(source: string): number {
    return this.sourceMapInstance.addSource(source);
  }

  /**
   * Appends an array of sources to the sourcemap's sources array
   *
   * @param sources an array of filepaths which should sbe appended to the sources array
   * @returns an array of indexes of the sources that have been added to the sourcemap, returned in the same order as provided in the argument
   */
  addSources(sources: Array<string>): Array<number> {
    return sources.map((s) => this.addSource(s));
  }

  /**
   * Get the index in the sources array for a certain source file filepath
   *
   * @param source the filepath of the source file
   */
  getSourceIndex(source: string): number {
    return this.sourceMapInstance.getSourceIndex(source);
  }

  /**
   * Get the source file filepath for a certain index of the sources array
   *
   * @param index the index of the source in the sources array
   */
  getSource(index: number): string {
    return this.sourceMapInstance.getSource(index);
  }

  /**
   * Get a list of all sources
   */
  getSources(): Array<string> {
    return this.sourceMapInstance.getSources();
  }

  /**
   * Set the sourceContent for a certain file
   * this is optional and is only recommended for files that we cannot read in at the end when we serialise the sourcemap
   *
   * @param sourceName the path of the sourceFile
   * @param sourceContent the content of the sourceFile
   */
  setSourceContent(sourceName: string, sourceContent: string): void {
    return this.sourceMapInstance.setSourceContentBySource(sourceName, sourceContent);
  }

  /**
   * Get the content of a source file if it is inlined as part of the source-map
   *
   * @param sourceName filename
   */
  getSourceContent(sourceName: string): string | null {
    return this.sourceMapInstance.getSourceContentBySource(sourceName);
  }

  /**
   * Get a list of all sources
   */
  getSourcesContent(): Array<string | null> {
    return this.sourceMapInstance.getSourcesContent();
  }

  /**
   * Get a map of the source and it's corresponding source content
   */
  getSourcesContentMap(): { [key: string]: string | null } {
    let sources = this.getSources();
    let sourcesContent = this.getSourcesContent();
    let results = {};
    for (let i = 0; i < sources.length; i++) {
      results[sources[i]] = sourcesContent[i] || null;
    }
    return results;
  }

  /**
   * Get the index in the names array for a certain name
   *
   * @param name the name you want to find the index of
   */
  getNameIndex(name: string): number {
    return this.sourceMapInstance.getNameIndex(name);
  }

  /**
   * Get the name for a certain index of the names array
   *
   * @param index the index of the name in the names array
   */
  getName(index: number): string {
    return this.sourceMapInstance.getName(index);
  }

  /**
   * Get a list of all names
   */
  getNames(): Array<string> {
    return this.sourceMapInstance.getNames();
  }

  /**
   * Get a list of all mappings
   */
  getMappings(): Array<IndexedMapping<number>> {
    return this.sourceMapInstance.getMappings();
  }

  /**
   * Convert a Mapping object that uses indexes for name and source to the actual value of name and source
   *
   * Note: This is only used internally, should not be used externally and will probably eventually get
   * handled directly in C++ for improved performance
   *
   * @param index the Mapping that should get converted to a string-based Mapping
   */
  indexedMappingToStringMapping(mapping: ?IndexedMapping<number>): ?IndexedMapping<string> {
    if (!mapping) return mapping;

    if (mapping.source != null && mapping.source > -1) {
      // $FlowFixMe
      mapping.source = this.getSource(mapping.source);
    }

    if (mapping.name != null && mapping.name > -1) {
      // $FlowFixMe
      mapping.name = this.getName(mapping.name);
    }

    // $FlowFixMe
    return mapping;
  }

  /**
   * Remaps original positions from this map to the ones in the provided map
   *
   * This works by finding the closest generated mapping in the provided map
   * to original mappings of this map and remapping those to be the original
   * mapping of the provided map.
   *
   * @param buffer exported SourceMap as a buffer
   */
  extends(buffer: Buffer | SourceMap): SourceMap {
    throw new Error('Should be implemented by extending');
  }

  /**
   * Returns an object with mappings, sources and names
   * This should only be used for tests, debugging and visualising sourcemaps
   *
   * Note: This is a fairly slow operation
   */
  getMap(): ParsedMap {
    return {
      mappings: this.getMappings(),
      sources: this.getSources(),
      sourcesContent: this.getSourcesContent(),
      names: this.getNames(),
    };
  }

  /**
   * Searches through the sourcemap and returns a mapping that is close to the provided generated line and column
   *
   * @param line the line in the generated code (starts at 1)
   * @param column the column in the generated code (starts at 0)
   */
  findClosestMapping(line: number, column: number): ?IndexedMapping<string> {
    throw new Error('SourceMap.findClosestMapping() must be implemented when extending SourceMap');
  }

  /**
   * Offset mapping lines from a certain position
   *
   * @param line the line in the generated code (starts at 1)
   * @param lineOffset the amount of lines to offset mappings by
   */
  offsetLines(line: number, lineOffset: number): ?IndexedMapping<string> {
    if (line < 1 || line + lineOffset < 1) {
      throw new Error('Line has to be positive');
    }

    if (lineOffset === 0) {
      return;
    }

    this.sourceMapInstance.offsetLines(line - 1, lineOffset);
  }

  /**
   * Offset mapping columns from a certain position
   *
   * @param line the line in the generated code (starts at 1)
   * @param column the column in the generated code (starts at 0)
   * @param columnOffset the amount of columns to offset mappings by
   */
  offsetColumns(line: number, column: number, columnOffset: number): ?IndexedMapping<string> {
    if (line < 1 || column < 0 || column + columnOffset < 0) {
      throw new Error('Line and Column has to be positive');
    }

    if (columnOffset === 0) {
      return;
    }

    this.sourceMapInstance.offsetColumns(line - 1, column, columnOffset);
  }

  /**
   * Returns a buffer that represents this sourcemap, used for caching
   */
  toBuffer(): Buffer {
    throw new Error('SourceMap.toBuffer() must be implemented when extending SourceMap');
  }

  /**
   * Returns a serialised map using VLQ Mappings
   */
  toVLQ(): VLQMap {
    return this.sourceMapInstance.toVLQ();
  }

  /**
   * A function that has to be called at the end of the SourceMap's lifecycle to ensure all memory and native bindings get de-allocated
   */
  delete() {
    throw new Error('SourceMap.delete() must be implemented when extending SourceMap');
  }

  /**
   * Returns a serialised map
   *
   * @param options options used for formatting the serialised map
   */
  async stringify(options: SourceMapStringifyOptions): Promise<string | VLQMap> {
    return partialVlqMapToSourceMap(this.toVLQ(), {
      ...options,
      rootDir: this.projectRoot || options.rootDir,
    });
  }
}
