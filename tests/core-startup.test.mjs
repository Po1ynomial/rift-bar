import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React } from "./helpers/modules.mjs";

const snapshot = JSON.stringify({ displays: [], spaces: [] });

async function loadIndex(run, mocks = {}) {
  const storage = new Map();
  const sheets = [];
  const calls = [];
  const loaded = await loadModule("index.jsx", {
    globals: {
      window: {
        localStorage: {
          getItem: (key) => storage.get(key),
          setItem: (key, value) => storage.set(key, value),
        },
      },
      document: {
        getElementById: () => null,
        querySelector: () => null,
        createElement: () => ({}),
        head: { appendChild: (sheet) => sheets.push(sheet) },
      },
    },
    mocks: {
      uebersicht: {
        React,
        run: async (command) => {
          calls.push(command);
          return run(command);
        },
      },
      ...mocks,
    },
  });
  return { ...loaded, storage, sheets, calls };
}

test("startup loads preferences before styling and the first Rift query", async () => {
  let release;
  const reading = new Promise((resolve) => {
    release = resolve;
  });
  const config = {
    global: { fontSize: "24px", riftPath: "/custom/Rift's CLI" },
    customStyles: { styles: ".custom { color: red; }" },
  };
  const {
    namespace: index,
    sheets,
    calls,
  } = await loadIndex(async (command) => {
    if (command.includes("test -e")) return "present";
    if (command.startsWith("cat ")) return reading;
    if (command.includes("init-rift.sh")) return snapshot;
    return "";
  });
  assert.equal(sheets.length, 0, "styles must not capture preferences at import time");
  const first = index.command();
  const second = index.command();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(!calls.some((command) => command.includes("subscribe-rift.sh")));
  release(JSON.stringify(config));
  assert.equal(await first, snapshot);
  assert.equal(await second, snapshot);
  assert.equal(sheets.length, 1);
  assert.match(sheets[0].innerHTML, /--font-size: 24px/);
  assert.match(sheets[0].innerHTML, /\.custom \{ color: red/);
  assert.equal(calls.filter((command) => command.startsWith("cat ")).length, 1);
  const subscribe = calls.filter((command) => command.includes("subscribe-rift.sh"));
  assert.equal(subscribe.length, 1);
  assert.ok(subscribe[0].includes(`'/custom/Rift'"'"'s CLI'`));
  assert.equal(index.refreshFrequency, false);
});

test("cached output cannot mount the bar before preference initialization", async () => {
  let parsed = 0;
  const { namespace: index } = await loadIndex(async () => "", {
    "./lib/rift": {
      getSnapshot: async () => snapshot,
      parseSnapshot: () => {
        parsed++;
        return { displays: [], spaces: [] };
      },
    },
  });
  index.render({ output: snapshot });
  assert.equal(parsed, 0);
  await index.command();
  index.render({ output: snapshot });
  assert.equal(parsed, 1);
});

test("a failed initialization blocks snapshots and can be retried", async () => {
  let attempts = 0;
  const {
    namespace: index,
    calls,
    sheets,
  } = await loadIndex(async (command) => {
    if (command.includes("test -e")) return "present";
    if (command.startsWith("cat ")) {
      if (++attempts === 1) return "not JSON";
      return JSON.stringify({ global: { fontSize: "17px" } });
    }
    return command.includes("init-rift.sh") ? snapshot : "";
  });
  await assert.rejects(index.command());
  assert.equal(sheets.length, 0);
  assert.ok(!calls.some((command) => command.includes("init-rift.sh")));
  assert.equal(await index.command(), snapshot);
  assert.match(sheets[0].innerHTML, /--font-size: 17px/);
});

test("style insertion failures retry startup and reload current preferences", async () => {
  let reads = 0;
  const {
    namespace: index,
    sheets,
    calls,
    context,
  } = await loadIndex(async (command) => {
    if (command.includes("test -e")) return "present";
    if (command.startsWith("cat ")) {
      return JSON.stringify({ global: { fontSize: ++reads === 1 ? "17px" : "19px" } });
    }
    return command.includes("init-rift.sh") ? snapshot : "";
  });
  let insertions = 0;
  const append = context.document.head.appendChild;
  context.document.head.appendChild = (sheet) => {
    if (++insertions === 1) throw new Error("Style insertion failed");
    append(sheet);
  };
  await assert.rejects(index.command(), /Style insertion failed/);
  assert.ok(!calls.some((command) => command.includes("init-rift.sh")));
  assert.equal(await index.command(), snapshot);
  assert.equal(reads, 2);
  assert.match(sheets[0].innerHTML, /--font-size: 19px/);
});
