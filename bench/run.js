const fs = require('fs-extra');
const path = require('path');

const { init } = require('./setup');
const { consume } = require('./consume');
const { serialize } = require('./serialize');
const { modify } = require('./modify');
const { append } = require('./append');

function formatSummary(results) {
  return results
    .map((result) => {
      // TODO: Add margin to result stats
      return `${result.title} x ${Math.round(result.stats.opsPerSec())} ops/sec ±${result.stats
        .relativeMarginOfError()
        .toPrecision(2)}% (${result.stats.samples()} runs sampled)`;
    })
    .join('\n');
}

async function run() {
  console.log('Initializing sourcemap...');
  await init;

  console.log('Running benchmark...');
  const results = [await consume(), await serialize(), await modify(), await append()];

  console.log('Formatting benchmark results...');
  const output = results.map(formatSummary).join('\n');

  console.log('Saving benchmark...');
  let benchFilePath = path.join(process.cwd(), 'bench.txt');
  await fs.writeFile(benchFilePath, output, 'utf-8');
}

run();
