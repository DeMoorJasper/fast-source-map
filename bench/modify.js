const { Benchmark } = require('tiny-benchy');
const { SourceMap } = require('./setup');
const AngularSourceMap = require('./maps/angular');

const setup = () => {
  let sourcemapInstance = new SourceMap();
  sourcemapInstance.addVLQMap(AngularSourceMap);
  return sourcemapInstance;
};

exports.modify = function () {
  const suite = new Benchmark({
    iterations: 100,
  });

  suite.add(
    'modify#positive line offset',
    (sourcemapInstance) => {
      sourcemapInstance.offsetLines(150, 254);
    },
    {
      setup,
    }
  );

  suite.add(
    'modify#negative line offset',
    (sourcemapInstance) => {
      sourcemapInstance.offsetLines(150, 254);
    },
    {
      setup,
    }
  );

  suite.add(
    'modify#positive column offset',
    (sourcemapInstance) => {
      sourcemapInstance.offsetColumns(301, 190, 568);
    },
    {
      setup,
    }
  );

  suite.add(
    'modify#negative column offset',
    (sourcemapInstance) => {
      sourcemapInstance.offsetColumns(301, 1000, -25);
    },
    {
      setup,
    }
  );

  return suite.run();
};
