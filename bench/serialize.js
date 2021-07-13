const { Benchmark } = require('tiny-benchy');
const { SourceMap } = require('./setup');
const AngularSourceMap = require('./maps/angular');

const setup = () => {
  let sourcemapInstance = new SourceMap();
  sourcemapInstance.addVLQMap(AngularSourceMap);
  return sourcemapInstance;
};

exports.serialize = function () {
  const suite = new Benchmark({
    iterations: 75,
  });

  suite.add(
    'serialize#Save buffer',
    (sourcemapInstance) => {
      sourcemapInstance.toBuffer();
    },
    {
      setup,
    }
  );

  suite.add(
    'serialize#Serialize to vlq',
    (sourcemapInstance) => {
      sourcemapInstance.toVLQ();
    },
    {
      setup,
    }
  );

  return suite.run();
};
