const assert = require("assert");
const SourceMap = require("../");

describe("SourceMap - Extend Map", () => {
  it("Basic extending", async function() {
    let originalMap = new SourceMap([
      {
        source: "index.js",
        name: "A",
        original: {
          line: 1,
          column: 0
        },
        generated: {
          line: 6,
          column: 15
        }
      }
    ]);

    let newMap = new SourceMap([
      {
        source: "index.js",
        name: "",
        original: {
          line: 6,
          column: 15
        },
        generated: {
          line: 5,
          column: 12
        }
      }
    ]);

    newMap.extends(originalMap.toBuffer());

    let mappings = newMap.getMap().mappings;

    assert.equal(mappings.length, 1);
    assert.deepEqual(mappings[0], {
      source: 0,
      name: 0,
      original: {
        line: 1,
        column: 0
      },
      generated: {
        line: 5,
        column: 12
      }
    });

    assert.deepEqual(newMap.stringify(), {
      sources: ["index.js"],
      names: ["A"],
      mappings: ";;;;;YACAA"
    });
  });

  it("Extending null mappings", async function() {
    let originalMap = new SourceMap([
      {
        source: "index.js",
        name: "",
        original: {
          line: 6,
          column: 15
        },
        generated: {
          line: 5,
          column: 12
        }
      },
      {
        generated: {
          line: 14,
          column: 165
        }
      }
    ]);

    let newMap = new SourceMap([
      {
        source: "index.js",
        name: "",
        original: {
          line: 14,
          column: 165
        },
        generated: {
          line: 1,
          column: 15
        }
      },
      {
        source: "index.js",
        name: "",
        original: {
          line: 5,
          column: 12
        },
        generated: {
          line: 1,
          column: 110
        }
      }
    ]);

    newMap.extends(originalMap.toBuffer());

    let mappings = newMap.getMap().mappings;

    assert.equal(mappings.length, 2);
    assert.deepEqual(mappings[0], {
      generated: {
        line: 1,
        column: 15
      }
    });
    assert.deepEqual(mappings[1], {
      source: 0,
      original: {
        line: 6,
        column: 15
      },
      generated: {
        line: 1,
        column: 110
      }
    });

    assert.deepEqual(newMap.stringify(), {
      mappings: ";e,+FAMe",
      sources: ["index.js"],
      names: []
    });
  });
});
