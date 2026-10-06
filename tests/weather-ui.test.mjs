import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React as baseReact } from "./helpers/modules.mjs";
import { createHookHarness } from "./helpers/hooks.mjs";
import { validCoordinates } from "../lib/widgets/weather.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
function walk(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const result = walk(child, predicate);
      if (result) return result;
    }
    return undefined;
  }
  if (predicate(node)) return node;
  return walk(node.props?.children, predicate);
}

test("the real weather view and hook load, retain stale data, recover, and clean up", async () => {
  const harness = createHookHarness();
  const React = { ...baseReact, ...harness.React, createElement: element };
  const config = {
    location_mode: "configured",
    location: { label: "Paris", latitude: 48.85, longitude: 2.35 },
    unit: "C",
    displays: [],
    show_icon: true,
  };
  config.enabled = true;
  config.show_location = true;
  const settings = { widgets: { weather: config } };
  const utilities = await loadModule("lib/utils.js", { mocks: { uebersicht: { React } } });
  let fail = false,
    requests = 0;
  const timers = new Map();
  let id = 0;
  const { namespace } = await loadModule("lib/components/data/weather.jsx", {
    jsx: true,
    globals: {
      AbortController,
      DOMException,
      URL,
      URLSearchParams,
      setTimeout: (fn) => {
        timers.set(++id, fn);
        return id;
      },
      clearTimeout: (key) => timers.delete(key),
      fetch: async () => {
        requests++;
        if (fail) throw new Error("Offline");
        return {
          ok: true,
          json: async () => ({
            current: { temperature_2m: 12, weather_code: 0, is_day: 1, time: 1700000000 },
          }),
        };
      },
    },
    mocks: {
      uebersicht: { React },
      "../simple-bar-context.jsx": { useSimpleBarContext: () => ({ displayIndex: 1, settings }) },
      "../../utils.js": { ...utilities.namespace, clickEffect: () => {} },
    },
  });
  assert.equal(harness.render(namespace.Widget).props.className, "weather");
  await flush();
  const ready = harness.render(namespace.Widget);
  assert.equal(ready.props.status, "ready");
  assert.ok(ready.props.children.includes("Paris, 12°C"));
  fail = true;
  ready.props.onRightClick({ preventDefault: () => {}, clientX: 0, clientY: 0 });
  await flush();
  const stale = harness.render(namespace.Widget);
  assert.equal(stale.props.status, "stale");
  assert.ok(stale.props.children.includes("Paris, 12°C"));
  fail = false;
  stale.props.onRightClick({ preventDefault: () => {}, clientX: 0, clientY: 0 });
  await flush();
  assert.equal(harness.render(namespace.Widget).props.status, "ready");
  assert.equal(requests, 3);
  harness.unmount();
  assert.equal(timers.size, 0);
});

test("city search does not save an ambiguous first result; selecting a result saves coordinates", async () => {
  const harness = createHookHarness();
  const React = { ...baseReact, ...harness.React, createElement: element };
  const locations = [
    { label: "Paris, France", latitude: 48.85, longitude: 2.35 },
    { label: "Paris, Texas", latitude: 33.66, longitude: -95.55 },
  ];
  const saved = [];
  const props = {
    defaultValue: { label: "Paris", latitude: null, longitude: null },
    onChange: (event) => saved.push(event.target.value),
  };
  const { namespace } = await loadModule("lib/components/settings/weather-location-picker.jsx", {
    jsx: true,
    globals: { AbortController, setTimeout, clearTimeout },
    mocks: {
      uebersicht: { React },
      "../../widgets/weather.js": { searchLocations: async () => locations, validCoordinates },
    },
  });
  const initial = harness.render(namespace.default, props);
  await walk(
    initial,
    (node) => node.type === "button" && node.props.children.includes("Search locations"),
  ).props.onClick();
  assert.equal(saved.length, 0);
  const results = harness.render(namespace.default, props);
  walk(
    results,
    (node) => node.type === "button" && node.props.children.includes("Paris, Texas"),
  ).props.onClick();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].latitude, 33.66);
  assert.equal(saved[0].longitude, -95.55);
  assert.equal(saved[0].label, "Paris, Texas");
  harness.unmount();
});

test("theme and location mode controls have distinct IDs and use typed fields", async () => {
  const { namespace } = await loadModule("lib/components/settings/settings-item.jsx", {
    jsx: true,
    mocks: { uebersicht: { React: { ...baseReact, createElement: element } } },
  });
  const props = { field: { type: "string", enum: ["auto"] }, value: "auto", onChange: () => {} };
  const theme = namespace.default({ ...props, code: "appearance.theme" });
  const location = namespace.default({ ...props, code: "widgets.weather.location_mode" });
  assert.equal(theme.type, "select");
  assert.notEqual(theme.props.id, location.props.id);
});
