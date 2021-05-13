import assert from 'assert';
import SourceMap from '.';

const SIMPLE_SOURCE_MAP = {
  version: 3,
  file: 'helloworld.js',
  sources: ['helloworld.coffee'],
  names: [],
  mappings: 'AAAA;AAAA,EAAA,OAAO,CAAC,GAAR,CAAY,aAAZ,CAAA,CAAA;AAAA',
};

describe('SourceMap - Formats', () => {
  it('Should return a base64 encoded inline map when format is inline', async () => {
    let map = new SourceMap('/test-root');
    map.addVLQMap({
      mappings: SIMPLE_SOURCE_MAP.mappings,
      sources: SIMPLE_SOURCE_MAP.sources,
      names: SIMPLE_SOURCE_MAP.names,
    });

    let stringifiedMap = await map.stringify({
      file: 'index.js.map',
      sourceRoot: '/',
      format: 'inline',
    });

    assert(stringifiedMap.startsWith('data:application/json;charset'));
  });

  it('Should return a stringified map when format is string', async () => {
    let map = new SourceMap('/test-root');
    map.addVLQMap({
      mappings: SIMPLE_SOURCE_MAP.mappings,
      sources: SIMPLE_SOURCE_MAP.sources,
      names: SIMPLE_SOURCE_MAP.names,
    });

    let stringifiedMap = await map.stringify({
      file: 'index.js.map',
      sourceRoot: '/',
      format: 'string',
    });

    assert(typeof stringifiedMap === 'string');
  });

  it('Should return an object map when format is object', async () => {
    let map = new SourceMap('/test-root');
    map.addVLQMap({
      mappings: SIMPLE_SOURCE_MAP.mappings,
      sources: SIMPLE_SOURCE_MAP.sources,
      names: SIMPLE_SOURCE_MAP.names,
    });

    let stringifiedMap = await map.stringify({
      file: 'index.js.map',
      sourceRoot: '/',
      format: 'object',
    });

    assert(typeof stringifiedMap === 'object');
  });

  it('Should make all sourcePaths relative to rootDir', async () => {
    let map = new SourceMap('/Users/test');
    map.addVLQMap({
      mappings: SIMPLE_SOURCE_MAP.mappings,
      sources: ['/Users/test/helloworld.coffee'],
      names: SIMPLE_SOURCE_MAP.names,
    });

    let stringifiedMap = await map.stringify({
      file: 'index.js.map',
      sourceRoot: '/',
      format: 'object',
    });

    assert.deepEqual(stringifiedMap.sources, ['helloworld.coffee']);
  });

  describe('win32', function () {
    let platform = process.platform;

    before(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    after(() => {
      Object.defineProperty(process, 'platform', { value: platform });
    });

    it('Should make all sourcePaths web friendly aka no windows backslashes', async () => {
      let map = new SourceMap('C:\\Users\\test\\');
      map.addVLQMap({
        mappings: SIMPLE_SOURCE_MAP.mappings,
        sources: ['C:\\Users\\test\\helloworld.coffee'],
        names: SIMPLE_SOURCE_MAP.names,
      });

      let stringifiedMap = await map.stringify({
        file: 'index.js.map',
        sourceRoot: '/',
        format: 'object',
      });

      assert.deepEqual(stringifiedMap.sources, ['helloworld.coffee']);
    });
  });
});
