const { Benchmark } = require('tiny-benchy');
const { SourceMap } = require('./setup');

const MAPPINGS = new Array(100).fill('').map((item, index) => {
  return {
    source: 'index.js',
    name: 'A',
    original: {
      line: index + 1,
      column: 0 + 10 * index,
    },
    generated: {
      line: 1,
      column: 15 + 10 * index,
    },
  };
});

exports.consume = function () {
  const suite = new Benchmark({
    iterations: 100,
  });

  suite.add(
    'consume#consume vlq mappings',
    (inputMap) => {
      let map = new SourceMap();
      map.addVLQMap({
        mappings: inputMap.mappings,
        sources: inputMap.sources,
        names: inputMap.names,
      });
      map.delete();
    },
    {
      setup: () => {
        let sourcemapInstance = new SourceMap();
        sourcemapInstance.addIndexedMappings(MAPPINGS);
        return sourcemapInstance.toVLQ();
      },
    }
  );

  suite.add(
    'consume#consume buffer',
    (mapBuffer) => {
      let map = new SourceMap('/', mapBuffer);
      map.delete();
    },
    {
      setup: () => {
        let sourcemapInstance = new SourceMap();
        sourcemapInstance.addIndexedMappings(MAPPINGS);
        return sourcemapInstance.toBuffer();
      },
    }
  );

  suite.add('consume#consume JS Mappings', () => {
    let map = new SourceMap();
    map.addIndexedMappings(MAPPINGS);
    map.delete();
  });

  return suite.run();
};
