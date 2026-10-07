import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React as baseReact } from "./helpers/modules.mjs";

const React = {
  ...baseReact,
  Fragment: "fragment",
  useRef: () => ({}),
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
};
const cases = {
  time: { time: "12:34", fillerWidth: 0.5 },
  weather: {
    latitude: 48,
    longitude: 2,
    location: "Paris",
    temperature: 12,
    unit: "C",
    code: 0,
    isDay: true,
    observedAt: 1700000000000,
  },
  github: { count: 2 },
  zoom: { mic: "on", video: "off" },
};

for (const [name, data] of Object.entries(cases)) {
  test(`${name} renders loading, ready, stale, failure, and disabled states`, async () => {
    const { namespace: preferences } = await loadModule("lib/settings.js", {
      mocks: { uebersicht: { React } },
    });
    const settings = structuredClone(preferences.defaultSettings);
    settings.widgets[name === "time" ? "clock" : name].enabled = true;
    let snapshot = { status: "loading" };
    let refreshed = 0;
    const { namespace } = await loadModule(`lib/components/data/${name}.jsx`, {
      jsx: true,
      mocks: {
        uebersicht: { React },
        "../rift-bar-context.jsx": { useRiftBarContext: () => ({ displayIndex: 1, settings }) },
        "../../hooks/use-widget.js": {
          default: () => ({
            ...snapshot,
            refresh: () => {
              refreshed++;
            },
          }),
        },
      },
    });
    assert.equal(namespace.Widget().props.className, name);
    snapshot = { status: "ready", data };
    const ready = namespace.Widget();
    assert.equal(ready.props.status, "ready");
    if (name === "github") assert.equal(ready.props.href, "https://github.com/notifications");
    snapshot = { status: "stale", data, error: new Error("Offline") };
    const stale = namespace.Widget();
    assert.equal(stale.props.status, "stale");
    assert.match(stale.props.title, /Offline/);
    if (name === "weather") assert.ok(stale.props.children.includes(" (stale)"));
    snapshot = { status: "error", error: new Error("Offline") };
    const failed = namespace.Widget();
    assert.equal(failed.props.status, "error");
    failed.props.onRetry();
    assert.equal(refreshed, 1);
    settings.widgets[name === "time" ? "clock" : name].enabled = false;
    assert.equal(namespace.Widget(), null);
  });
}

test("a successful weather response renders content instead of remaining a loader", async () => {
  const { namespace: preferences } = await loadModule("lib/settings.js", {
    mocks: { uebersicht: { React } },
  });
  const settings = structuredClone(preferences.defaultSettings);
  settings.widgets.weather.enabled = true;
  const { namespace } = await loadModule("lib/components/data/weather.jsx", {
    jsx: true,
    mocks: {
      uebersicht: { React },
      "../rift-bar-context.jsx": { useRiftBarContext: () => ({ displayIndex: 1, settings }) },
      "../../hooks/use-widget.js": {
        default: () => ({ status: "ready", data: cases.weather, refresh: () => {} }),
      },
    },
  });
  assert.ok(namespace.Widget().props.children.includes("Paris, 12°C"));
});

test("unnamed workspaces show their index with the identity in the tooltip", async () => {
  const { namespace: preferences } = await loadModule("lib/settings.js", {
    mocks: { uebersicht: { React } },
  });
  const settings = structuredClone(preferences.defaultSettings);
  const mocks = {
    uebersicht: { React },
    "../rift-bar-context.jsx": { useRiftBarContext: () => ({ settings, displayUuid: "d1" }) },
    "../../rift.js": { goToSpace: () => {} },
    "./opened-apps.jsx": { default: () => null },
  };
  const { namespace } = await loadModule("lib/components/workspaces/space.jsx", {
    jsx: true,
    mocks,
  });
  const render = (space) => {
    const fragment = namespace.default({ space, lastOfSpace: false });
    const spaceDiv = fragment.props.children[1];
    return spaceDiv.props.children[0];
  };
  const unnamed = render({ workspace: "d1:0", index: 0, focused: true, windows: [], monitor: 1 });
  assert.equal(unnamed.props.children[0], "1");
  assert.equal(unnamed.props["data-workspace"], "d1:0");
  assert.match(unnamed.props.title, /Workspace 1/);
  const named = render({
    workspace: "d1:1",
    index: 1,
    name: "Code",
    focused: false,
    windows: [],
    monitor: 1,
  });
  assert.equal(named.props.children[0], "Code");
  assert.match(named.props.title, /Code/);
});

test("window pills carry the app name or full title as their tooltip", async () => {
  const { namespace: preferences } = await loadModule("lib/settings.js", {
    mocks: { uebersicht: { React } },
  });
  const settings = structuredClone(preferences.defaultSettings);
  const { namespace } = await loadModule("lib/components/workspaces/window.jsx", {
    jsx: true,
    mocks: {
      uebersicht: { React },
      "../rift-bar-context.jsx": { useRiftBarContext: () => ({ settings }) },
      "../../app-icons": { apps: { Default: () => null } },
      "../icons/icon.jsx": { SuspenseIcon: ({ children }) => children },
      "../../utils": { clickEffect: () => {}, classNames: (...names) => names.join(" ") },
      "../../rift": { focusWindow: () => {} },
    },
  });
  const window = {
    focused: false,
    "app-name": "kitty",
    "window-title": "config.js",
    "window-id": { pid: 1, idx: 2 },
  };
  const pill = () => {
    const element = namespace.default({ window });
    return element;
  };
  settings.process.show_titles = false;
  assert.equal(pill().props.title, "kitty / config.js");
  settings.process.show_titles = true;
  assert.equal(pill().props.title, "kitty / config.js");
});
