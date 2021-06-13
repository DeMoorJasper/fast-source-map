#![deny(clippy::all)]

extern crate parcel_sourcemap;

use js_sys::Uint8Array;
use parcel_sourcemap::{Mapping, OriginalLocation, SourceMap as NativeSourceMap};
use rkyv::AlignedVec;
use serde::Serialize;
use std::convert::TryFrom;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
#[allow(non_snake_case)]
struct VLQResult {
    mappings: String,
    sources: Vec<String>,
    sourcesContent: Vec<String>,
    names: Vec<String>,
}

#[derive(Serialize)]
struct PositionResult {
    line: u32,
    column: u32,
}

#[allow(non_snake_case)]
#[derive(Serialize)]
struct MappingResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    original: Option<PositionResult>,
    generated: PositionResult,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<u32>,
}

impl From<&Mapping> for MappingResult {
    fn from(mapping: &Mapping) -> MappingResult {
        MappingResult {
            generated: PositionResult {
                line: mapping.generated_line + 1,
                column: mapping.generated_column,
            },
            original: mapping.original.map(|p| PositionResult {
                line: p.original_line + 1,
                column: p.original_column,
            }),
            name: mapping.original.and_then(|p| p.name),
            source: mapping.original.map(|p| p.source),
        }
    }
}

#[wasm_bindgen]
pub struct SourceMap {
    map: NativeSourceMap,
}

#[wasm_bindgen]
#[allow(non_snake_case)]
impl SourceMap {
    #[wasm_bindgen(constructor)]
    pub fn new(opts: JsValue) -> Result<SourceMap, JsValue> {
        if let Some(str) = opts.as_string() {
            return Ok(SourceMap {
                map: NativeSourceMap::new(&str),
            });
        }

        Ok(SourceMap {
            map: NativeSourceMap::from_buffer(&Uint8Array::from(opts).to_vec())?,
        })
    }

    pub fn getProjectRoot(&self) -> String {
        self.map.project_root.clone()
    }

    pub fn addVLQMap(
        &mut self,
        vlq_mappings: String,
        sources: JsValue,
        sources_content: JsValue,
        names: JsValue,
        line_offset: i32,
        column_offset: i32,
    ) -> Result<JsValue, JsValue> {
        let sources_string: Vec<String> = sources.into_serde().unwrap();
        let sources_content_string: Vec<String> = sources_content.into_serde().unwrap();
        let names_string: Vec<String> = names.into_serde().unwrap();
        self.map.add_vlq_map(
            vlq_mappings.as_bytes(),
            sources_string.iter().map(|s| s.as_str()).collect(),
            sources_content_string.iter().map(|s| s.as_str()).collect(),
            names_string.iter().map(|s| s.as_str()).collect(),
            line_offset.into(),
            column_offset.into(),
        )?;

        Ok(JsValue::UNDEFINED)
    }

    pub fn toVLQ(&mut self) -> Result<JsValue, JsValue> {
        let mut vlq_output: Vec<u8> = vec![];
        self.map.write_vlq(&mut vlq_output)?;

        let result = VLQResult {
            mappings: String::from_utf8(vlq_output).unwrap(),
            sources: self.map.sources.clone(),
            sourcesContent: self.map.sources_content.clone(),
            names: self.map.names.clone(),
        };
        Ok(JsValue::from_serde(&result).unwrap())
    }

    pub fn toJSONBuffer(&mut self, file: String, source_root: String) -> Result<JsValue, JsValue> {
        let buf = self.map.write_to_json_buffer(file, source_root)?;
        Ok(Uint8Array::from(buf.as_slice()).into())
    }

    pub fn toDataURL(&mut self, file: String, source_root: String) -> Result<JsValue, JsValue> {
        let string = self.map.write_to_data_url(file, source_root)?;
        Ok(JsValue::from(string))
    }

    pub fn getMappings(&self) -> Result<JsValue, JsValue> {
        let mut mappings: Vec<MappingResult> = vec![];
        for (generated_line, mapping_line) in self.map.mapping_lines.iter().enumerate() {
            for mapping in mapping_line.mappings.iter() {
                mappings.push(MappingResult {
                    generated: PositionResult {
                        line: (generated_line + 1) as u32,
                        column: mapping.generated_column,
                    },
                    original: mapping.original.map(|p| PositionResult {
                        line: p.original_line + 1,
                        column: p.original_column,
                    }),
                    name: mapping.original.and_then(|p| p.name),
                    source: mapping.original.map(|p| p.source),
                });
            }
        }
        Ok(JsValue::from_serde(&mappings).unwrap())
    }

    pub fn getSources(&self) -> Result<JsValue, JsValue> {
        Ok(JsValue::from_serde(&self.map.sources).unwrap())
    }

    pub fn getSourcesContent(&self) -> Result<JsValue, JsValue> {
        Ok(JsValue::from_serde(&self.map.sources_content).unwrap())
    }

    pub fn getNames(&self) -> Result<JsValue, JsValue> {
        Ok(JsValue::from_serde(&self.map.names).unwrap())
    }

    pub fn addName(&mut self, name: &str) -> u32 {
        self.map.add_name(name)
    }

    pub fn addSource(&mut self, source: &str) -> u32 {
        self.map.add_source(source)
    }

    pub fn getName(&self, index: u32) -> String {
        self.map.get_name(index).unwrap_or("").to_string()
    }

    pub fn getSource(&self, index: u32) -> String {
        self.map.get_source(index).unwrap_or("").to_string()
    }

    pub fn getNameIndex(&self, name: &str) -> i32 {
        self.map
            .get_name_index(name)
            .map(|v| i32::try_from(v).unwrap())
            .unwrap_or(-1)
    }

    pub fn getSourceIndex(&self, source: &str) -> Result<JsValue, JsValue> {
        Ok(JsValue::from(
            self.map
                .get_source_index(source)?
                .map(|v| i32::try_from(v).unwrap())
                .unwrap_or(-1),
        ))
    }

    pub fn addIndexedMappings(&mut self, mappings_arr: &[i32]) {
        let mappings_count = mappings_arr.len();
        let mut generated_line: u32 = 0; // 0
        let mut generated_column: u32 = 0; // 1
        let mut original_line: i32 = 0; // 2
        let mut original_column: i32 = 0; // 3
        let mut original_source: i32 = 0; // 4
        for (i, item) in mappings_arr.iter().enumerate().take(mappings_count) {
            let value = *item;

            match i % 6 {
                0 => {
                    generated_line = value as u32;
                }
                1 => {
                    generated_column = value as u32;
                }
                2 => {
                    original_line = value;
                }
                3 => {
                    original_column = value;
                }
                4 => {
                    original_source = value;
                }
                5 => {
                    self.map.add_mapping(
                        generated_line,
                        generated_column,
                        if original_line > -1 && original_column > -1 && original_source > -1 {
                            Some(OriginalLocation {
                                original_line: original_line as u32,
                                original_column: original_column as u32,
                                source: original_source as u32,
                                name: if value > -1 { Some(value as u32) } else { None },
                            })
                        } else {
                            None
                        },
                    );
                }
                _ => unreachable!(),
            }
        }
    }

    pub fn toBuffer(&self) -> Result<JsValue, JsValue> {
        let mut buffer_data = AlignedVec::new();
        self.map.to_buffer(&mut buffer_data)?;
        Ok(Uint8Array::from(buffer_data.as_slice()).into())
    }

    pub fn addSourceMap(
        &mut self,
        previous_map_instance: &mut SourceMap,
        line_offset: i32,
    ) -> Result<JsValue, JsValue> {
        self.map
            .add_sourcemap(&mut previous_map_instance.map, line_offset.into())?;

        Ok(JsValue::UNDEFINED)
    }

    pub fn setSourceContentBySource(
        &mut self,
        source: &str,
        source_content: &str,
    ) -> Result<JsValue, JsValue> {
        let source_index = self.addSource(source) as usize;
        self.map.set_source_content(source_index, source_content)?;

        Ok(JsValue::UNDEFINED)
    }

    pub fn getSourceContentBySource(&self, source: &str) -> Result<JsValue, JsValue> {
        let source_index = self.map.get_source_index(source)?;

        match source_index {
            Some(i) => {
                let source_content = self.map.get_source_content(i)?;
                Ok(JsValue::from_str(source_content))
            }
            None => Ok(JsValue::from_str("")),
        }
    }

    pub fn addEmptyMap(
        &mut self,
        source: &str,
        source_content: &str,
        line_offset: i32,
    ) -> Result<JsValue, JsValue> {
        self.map
            .add_empty_map(source, source_content, line_offset.into())?;

        Ok(JsValue::UNDEFINED)
    }

    pub fn extends(&mut self, previous_map_instance: &mut SourceMap) -> Result<JsValue, JsValue> {
        self.map.extends(&mut previous_map_instance.map)?;

        Ok(JsValue::UNDEFINED)
    }

    pub fn findClosestMapping(&mut self, generated_line: u32, generated_column: u32) -> JsValue {
        match self
            .map
            .find_closest_mapping(generated_line, generated_column)
        {
            Some(mapping) => JsValue::from_serde(&MappingResult::from(&mapping)).unwrap(),
            None => JsValue::NULL,
        }
    }

    pub fn offsetLines(
        &mut self,
        generated_line: u32,
        generated_line_offset: i32,
    ) -> Result<JsValue, JsValue> {
        self.map
            .offset_lines(generated_line, generated_line_offset.into())?;

        Ok(JsValue::UNDEFINED)
    }

    pub fn offsetColumns(
        &mut self,
        generated_line: u32,
        generated_column: u32,
        generated_column_offset: i32,
    ) -> Result<JsValue, JsValue> {
        self.map.offset_columns(
            generated_line,
            generated_column,
            generated_column_offset.into(),
        )?;

        Ok(JsValue::UNDEFINED)
    }
}
