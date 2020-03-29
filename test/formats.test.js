const assert = require("assert");
const SourceMap = require("../dist/browser").default;

const SIMPLE_SOURCE_MAP = {
  version: 3,
  file: "helloworld.js",
  sources: ["helloworld.coffee"],
  names: [],
  mappings: "AAAA;AAAA,EAAA,OAAO,CAAC,GAAR,CAAY,aAAZ,CAAA,CAAA;AAAA"
};

describe("SourceMap - Formats", () => {
  it("Should return a base64 encoded inline map when format is inline", async () => {
    let map = new SourceMap();
    map.addRawMappings(
      SIMPLE_SOURCE_MAP.mappings,
      SIMPLE_SOURCE_MAP.sources,
      SIMPLE_SOURCE_MAP.names
    );

    let stringifiedMap = await map.stringify({
      file: "index.js.map",
      sourceRoot: "/",
      format: "inline"
    });
    
    assert(stringifiedMap.startsWith('data:application/json;charset'));
  });

  it("Should return a base64 encoded inline map when using deprecated inlineMap option", async () => {
    let map = new SourceMap();
    map.addRawMappings(
      SIMPLE_SOURCE_MAP.mappings,
      SIMPLE_SOURCE_MAP.sources,
      SIMPLE_SOURCE_MAP.names
    );

    let stringifiedMap = await map.stringify({
      file: "index.js.map",
      sourceRoot: "/",
      inlineMap: true
    });
    
    assert(stringifiedMap.startsWith('data:application/json;charset'));
  });

  it("Should return a stringified map when format is string", async () => {
    let map = new SourceMap();
    map.addRawMappings(
      SIMPLE_SOURCE_MAP.mappings,
      SIMPLE_SOURCE_MAP.sources,
      SIMPLE_SOURCE_MAP.names
    );

    let stringifiedMap = await map.stringify({
      file: "index.js.map",
      sourceRoot: "/",
      format: "string"
    });
    
    assert(typeof stringifiedMap === 'string');
  });

  it("Should return an object map when format is object", async () => {
    let map = new SourceMap();
    map.addRawMappings(
      SIMPLE_SOURCE_MAP.mappings,
      SIMPLE_SOURCE_MAP.sources,
      SIMPLE_SOURCE_MAP.names
    );

    let stringifiedMap = await map.stringify({
      file: "index.js.map",
      sourceRoot: "/",
      format: "object"
    });
    
    assert(typeof stringifiedMap === 'object');
  });
});
