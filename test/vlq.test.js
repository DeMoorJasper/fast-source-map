import assert from 'assert';
import SourceMap from '.';

const SIMPLE_SOURCE_MAP = {
  version: 3,
  file: 'helloworld.js',
  sources: ['helloworld.coffee'],
  names: [],
  mappings: 'AAAA;AAAA,EAAA,OAAO,CAAC,GAAR,CAAY,aAAZ,CAAA,CAAA;AAAA',
};

describe('SourceMap - VLQ', () => {
  it('Should be able to create simple VLQ output, using toVLQ', async () => {
    let map = new SourceMap('/test-root');
    map.addVLQMap({
      mappings: SIMPLE_SOURCE_MAP.mappings,
      sources: SIMPLE_SOURCE_MAP.sources,
      names: SIMPLE_SOURCE_MAP.names,
    });
    let stringifiedMap = map.toVLQ();
    assert.equal(stringifiedMap.mappings, SIMPLE_SOURCE_MAP.mappings);
  });
});
