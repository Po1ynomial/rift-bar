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
    settings.widgets[`${name}Widget`] = true;
    let snapshot = { status: "loading" };
    let refreshed = 0;
    const { namespace } = await loadModule(`lib/components/data/${name}.jsx`, {
      jsx: true,
      mocks: {
        uebersicht: { React },
        "../simple-bar-context.jsx": { useSimpleBarContext: () => ({ displayIndex: 1, settings }) },
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
    settings.widgets[`${name}Widget`] = false;
    assert.equal(namespace.Widget(), null);
  });
}

test("a successful weather response renders content instead of remaining a loader", async () => {
  const { namespace: preferences } = await loadModule("lib/settings.js", {
    mocks: { uebersicht: { React } },
  });
  const settings = structuredClone(preferences.defaultSettings);
  settings.widgets.weatherWidget = true;
  const { namespace } = await loadModule("lib/components/data/weather.jsx", {
    jsx: true,
    mocks: {
      uebersicht: { React },
      "../simple-bar-context.jsx": { useSimpleBarContext: () => ({ displayIndex: 1, settings }) },
      "../../hooks/use-widget.js": {
        default: () => ({ status: "ready", data: cases.weather, refresh: () => {} }),
      },
    },
  });
  assert.ok(namespace.Widget().props.children.includes("Paris, 12°C"));
});
