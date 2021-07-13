const { Benchmark } = require('tiny-benchy');
const { SourceMap } = require('./setup');
const AngularSourceMap = require('./maps/angular');

const setup = () => {
  let sourcemapInstance = new SourceMap();
  sourcemapInstance.addVLQMap(AngularSourceMap);

  let sourcemapInstance2 = new SourceMap();
  sourcemapInstance2.addVLQMap(AngularSourceMap);

  return {
    sourcemapInstance,
    sourcemapInstance2,
  };
};

exports.append = function () {
  const suite = new Benchmark({
    iterations: 10,
  });

  suite.add(
    'append#addSourceMap',
    ({ sourcemapInstance, sourcemapInstance2 }) => {
      sourcemapInstance.addSourceMap(sourcemapInstance2, 318);
    },
    { setup }
  );

  return suite.run();
};
