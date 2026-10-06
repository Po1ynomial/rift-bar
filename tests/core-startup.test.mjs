import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React } from "./helpers/modules.mjs";
const snapshot = JSON.stringify({ displays: [], spaces: [] });
const envelope = (text) => JSON.stringify({ path: "/config.toml", revision: "revision", text });
async function loadIndex(run, mocks = {}) {
  const storage = new Map();
  const sheets = [];
  const calls = [];
  const loaded = await loadModule("index.jsx", {
    globals: {
      window: {
        localStorage: {
          getItem: (key) => storage.get(key) ?? null,
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

test("startup loads TOML before styling and the first Rift query, without a startup save", async () => {
  let release;
  const reading = new Promise((resolve) => {
    release = resolve;
  });
  const {
    namespace: index,
    sheets,
    calls,
  } = await loadIndex(async (command) => {
    if (command.includes("config-file.sh read")) return reading;
    return command.includes("init-rift.sh") ? snapshot : "";
  });
  assert.equal(sheets.length, 0);
  const first = index.command(),
    second = index.command();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(!calls.some((command) => command.includes("subscribe-rift.sh")));
  release(envelope('[appearance]\nfont_size = "24px"\n[rift]\ncli_path = "/custom/Rift\'s CLI"\n'));
  assert.equal(await first, snapshot);
  assert.equal(await second, snapshot);
  assert.equal(sheets.length, 2);
  assert.match(sheets[1].innerHTML, /--font-size: 24px/);
  assert.equal(calls.filter((command) => command.includes("config-file.sh read")).length, 1);
  assert.ok(!calls.some((command) => command.includes("config-file.sh save")));
  const subscribe = calls.filter((command) => command.includes("subscribe-rift.sh"));
  assert.equal(subscribe.length, 1);
  assert.ok(subscribe[0].includes(`'/custom/Rift'"'"'s CLI'`));
  assert.equal(index.refreshFrequency, false);
});

test("cached output cannot mount the bar before configuration initialization", async () => {
  let parsed = 0;
  const { namespace: index } = await loadIndex(async () => envelope(""), {
    "./lib/rift.js": {
      shellQuote: String,
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

test("invalid startup blocks snapshots and can be retried", async () => {
  let attempts = 0;
  const {
    namespace: index,
    calls,
    sheets,
  } = await loadIndex(async (command) => {
    if (command.includes("config-file.sh read"))
      return envelope(++attempts === 1 ? "not TOML" : '[appearance]\nfont_size = "17px"');
    return command.includes("init-rift.sh") ? snapshot : "";
  });
  await assert.rejects(index.command());
  assert.equal(sheets.length, 0);
  assert.ok(!calls.some((command) => command.includes("init-rift.sh")));
  assert.equal(await index.command(), snapshot);
  assert.match(sheets[1].innerHTML, /--font-size: 17px/);
});

test("style insertion failures retry initialization and reread current configuration", async () => {
  let reads = 0;
  const {
    namespace: index,
    sheets,
    calls,
    context,
  } = await loadIndex(async (command) => {
    if (command.includes("config-file.sh read"))
      return envelope(`[appearance]\nfont_size = "${++reads === 1 ? 17 : 19}px"`);
    return command.includes("init-rift.sh") ? snapshot : "";
  });
  const append = context.document.head.appendChild;
  let count = 0;
  context.document.head.appendChild = (sheet) => {
    if (++count === 1) throw new Error("Style insertion failed");
    append(sheet);
  };
  await assert.rejects(index.command(), /Style insertion failed/);
  assert.ok(!calls.some((command) => command.includes("init-rift.sh")));
  assert.equal(await index.command(), snapshot);
  assert.equal(reads, 2);
  assert.match(sheets[1].innerHTML, /--font-size: 19px/);
});

test("centering reads process.centered, and retired bar features have no classes", async () => {
  const { namespace: index } = await loadIndex(async () => envelope(""));
  const { defaultSettings } = await import("../lib/config.js");
  const settings = structuredClone(defaultSettings);
  settings.process.centered = true;
  settings.bar.background = false;
  settings.bar.shadow = false;
  const classes = index.barClasses(settings);
  assert.doesNotMatch(classes, /process-aligned-to-left|on-bottom|no-color/);
  assert.match(classes, /no-bar-background/);
  assert.match(classes, /no-bar-shadow/);
});

test("normal and error views keep foreground contents in a separate fixed-height row", async () => {
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  const mockReact = {
    ...React,
    Fragment: "fragment",
    createElement: element,
    useRef: () => ({}),
    useEffect: () => {},
  };
  const { namespace: index } = await loadModule("index.jsx", {
    jsx: true,
    mocks: { uebersicht: { React: mockReact } },
  });
  const tree = index.Bar({ spaces: [] });
  const row = tree.props.children.find(
    (child) => child?.props?.className === "simple-bar__foreground",
  );
  assert.ok(row);
  assert.ok(row.props.children.some((child) => child?.props?.className === "simple-bar__data"));
  const { namespace: error } = await loadModule("lib/components/error.jsx", {
    jsx: true,
    mocks: { uebersicht: { React: mockReact } },
  });
  const failed = error.Component({ type: "noOutput", classes: "simple-bar" });
  assert.ok(
    failed.props.children.some((child) => child?.props?.className === "simple-bar__foreground"),
  );
});
