import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../lib/config.js";
import { loadModule, React as baseReact } from "./helpers/modules.mjs";
import { createHookHarness } from "./helpers/hooks.mjs";
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
function find(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const cases = {
  clock: ["time", { time: "12:34", fillerWidth: 0.5 }],
  date: ["date-display", { now: "1 Feb" }],
  battery: [
    "battery",
    { system: "arm64", percentage: 50, charging: false, caffeinate: "", lowPowerMode: false },
  ],
  wifi: ["wifi", { status: "active", ssid: "Home" }],
  volume: ["sound", { volume: "25", muted: "false" }],
  microphone: ["mic", { volume: "40" }],
  keyboard: ["keyboard", { keyboard: "US" }],
  cpu: ["cpu", { usage: 25 }],
  memory: ["memory", { free: 50 }],
  network_stats: ["netstats", { download: 1200, upload: 500 }],
  notifications: [
    "notifications",
    [{ name: "Mail", badge: "2", bundlePath: "/Applications/Mail.app" }],
  ],
  weather: ["weather", { location: "Paris", temperature: 12, code: 0, isDay: true, unit: "C" }],
  github: ["github", { count: 2 }],
  zoom: ["zoom", { mic: "on", video: "off" }],
};
for (const [id, [filename, data]] of Object.entries(cases))
  test(`${id} consumes the new config and honors UUID restrictions, stale data, and disablement`, async () => {
    const hooks = createHookHarness();
    const React = { ...baseReact, ...hooks.React, Fragment: "fragment", createElement: element };
    let settings = resolveConfig({ widgets: { [id]: { enabled: true, displays: ["A"] } } });
    let uuid = "A";
    let snapshot = { status: "ready", data };
    const { namespace } = await loadModule(`lib/components/data/${filename}.jsx`, {
      jsx: true,
      mocks: {
        uebersicht: { React },
        "../rift-bar-context.jsx": {
          useRiftBarContext: () => ({ settings, displayUuid: uuid }),
        },
        "../../hooks/use-widget.js": { default: () => ({ ...snapshot, refresh: () => {} }) },
      },
    });
    hooks.render(namespace.Widget);
    const ready = hooks.render(namespace.Widget);
    assert.ok(
      find(
        ready,
        (node) => node.props?.status === "ready" || node.props?.["data-status"] === "ready",
      ),
    );
    snapshot = { status: "stale", data, error: new Error("Offline") };
    assert.ok(
      find(
        hooks.render(namespace.Widget),
        (node) => node.props?.status === "stale" || node.props?.["data-status"] === "stale",
      ),
    );
    snapshot = { status: "error", error: new Error("Offline") };
    assert.equal(hooks.render(namespace.Widget).props.status, "error");
    uuid = "B";
    assert.equal(hooks.render(namespace.Widget), null);
    uuid = "A";
    settings = resolveConfig({ widgets: { [id]: { enabled: false } } });
    assert.equal(hooks.render(namespace.Widget), null);
    hooks.unmount();
  });

const window = (id, focused = false) => ({
  "window-id": { pid: 1, idx: id },
  "app-name": id === 1 ? "Finder" : "Editor",
  "window-title": `Title ${id}`,
  focused,
});
const spaces = [
  {
    workspace: "A:0",
    displayUuid: "A",
    monitor: 1,
    index: 0,
    focused: true,
    name: "Main",
    windows: [window(1), window(2, true)],
  },
  {
    workspace: "A:1",
    displayUuid: "A",
    monitor: 1,
    index: 1,
    focused: false,
    name: "Empty",
    windows: [],
  },
  {
    workspace: "B:0",
    displayUuid: "B",
    monitor: 2,
    index: 0,
    focused: true,
    name: "Main",
    windows: [],
  },
];
const React = { ...baseReact, Fragment: "fragment", useRef: () => ({}), createElement: element };
function context(settings) {
  return {
    settings,
    displayUuid: "A",
    displays: [
      { uuid: "A", index: 1 },
      { uuid: "B", index: 2 },
    ],
  };
}

test("workspace display inclusion is distinct from section visibility and retains unique identities", async () => {
  let settings = resolveConfig({ workspaces: { all_displays: true } });
  const { namespace } = await loadModule("lib/components/workspaces/spaces.jsx", {
    jsx: true,
    mocks: {
      uebersicht: { React },
      "../rift-bar-context.jsx": { useRiftBarContext: () => context(settings) },
      "../workspace-context.jsx": { useWorkspaceContext: () => ({ spaces }) },
    },
  });
  let tree = namespace.default();
  assert.deepEqual(
    Array.from(tree.props.children[0], (node) => node.props.space.workspace),
    ["A:0", "A:1", "B:0"],
  );
  settings = resolveConfig({});
  tree = namespace.default();
  assert.equal(tree.props.children[0].length, 2);
  settings = resolveConfig({ workspaces: { displays: ["B"] } });
  assert.equal(namespace.default(), null);
});

test("workspace empty/icon preferences and exact filters affect presentation only", async () => {
  const settings = resolveConfig({
    workspaces: { show_empty: false, show_app_icons: false },
    windows: { exclude_apps: ["Finder"] },
  });
  const { namespace } = await loadModule("lib/components/workspaces/space.jsx", {
    jsx: true,
    mocks: {
      uebersicht: { React },
      "../rift-bar-context.jsx": { useRiftBarContext: () => context(settings) },
    },
  });
  assert.equal(namespace.default({ space: spaces[1] }), null);
  assert.ok(namespace.default({ space: spaces[2] }));
  const tree = namespace.default({ space: spaces[0] });
  const button = find(tree, (node) => node.type === "button");
  assert.equal(button.props.children[1], false);
});

test("window selectors read the new process settings and do not include inactive workspaces", async () => {
  let settings = resolveConfig({
    process: { centered: true },
    windows: { exclude_apps: ["Finder"] },
  });
  const mocks = {
    uebersicht: { React },
    "../rift-bar-context.jsx": { useRiftBarContext: () => context(settings) },
    "../workspace-context.jsx": { useWorkspaceContext: () => ({ spaces }) },
  };
  const { namespace: process } = await loadModule("lib/components/workspaces/process.jsx", {
    jsx: true,
    mocks,
  });
  const tree = process.default();
  assert.match(tree.props.className, /process--centered/);
  const list = tree.props.children[0].props.children[0];
  assert.equal(list.length, 1);
  assert.equal(list[0].props.window["app-name"], "Editor");
  settings = resolveConfig({ process: { mode: "hidden" } });
  assert.equal(process.default(), null);
  const { namespace: view } = await loadModule("lib/components/workspaces/window.jsx", {
    jsx: true,
    mocks,
  });
  settings = resolveConfig({ process: { mode: "focused", show_titles: false } });
  assert.equal(view.default({ window: window(1) }), null);
  const selected = view.default({ window: window(2, true) });
  assert.match(selected.props.className, /process__window--focused/);
  assert.equal(selected.props.children[1].props.children[0].props.children[0], "Editor");
});
