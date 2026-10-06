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
    for (const child of node) { const result = walk(child, predicate); if (result) return result; }
    return undefined;
  }
  if (predicate(node)) return node;
  return walk(node.props?.children, predicate);
}

test("the real weather view and hook load, retain stale data, recover, and clean up", async () => {
  const harness = createHookHarness();
  const React = { ...baseReact, ...harness.React, createElement: element };
  const config = { locationMode: "configured", weatherLocation: { label: "Paris", latitude: 48.85, longitude: 2.35 }, unit: "C", showOnDisplay: "", showIcon: true };
  const settings = { widgets: { weatherWidget: true }, weatherWidgetOptions: config };
  const utilities = await loadModule("lib/utils.js", { mocks: { uebersicht: { React } } });
  let fail = false, requests = 0;
  const timers = new Map();
  let id = 0;
  const { namespace } = await loadModule("lib/components/data/weather.jsx", {
    jsx: true,
    globals: {
      AbortController, DOMException, URL, URLSearchParams,
      setTimeout: (fn) => { timers.set(++id, fn); return id; }, clearTimeout: (key) => timers.delete(key),
      fetch: async () => {
        requests++;
        if (fail) throw new Error("Offline");
        return { ok: true, json: async () => ({ current: { temperature_2m: 12, weather_code: 0, is_day: 1, time: 1700000000 } }) };
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
  const props = { defaultValue: { label: "Paris", latitude: null, longitude: null }, onChange: (event) => saved.push(event.target.value) };
  const { namespace } = await loadModule("lib/components/settings/weather-location-picker.jsx", {
    jsx: true,
    globals: { AbortController, setTimeout, clearTimeout },
    mocks: {
      uebersicht: { React },
      "../../widgets/weather.js": { searchLocations: async () => locations, validCoordinates },
    },
  });
  const initial = harness.render(namespace.default, props);
  await walk(initial, (node) => node.type === "button" && node.props.children.includes("Search locations")).props.onClick();
  assert.equal(saved.length, 0);
  const results = harness.render(namespace.default, props);
  walk(results, (node) => node.type === "button" && node.props.children.includes("Paris, Texas")).props.onClick();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].latitude, 33.66);
  assert.equal(saved[0].longitude, -95.55);
  assert.equal(saved[0].label, "Paris, Texas");
  harness.unmount();
});

test("weather location and theme radios have distinct input IDs", async () => {
  const { namespace } = await loadModule("lib/components/settings/settings-item.jsx", {
    jsx: true, mocks: { uebersicht: { React: { ...baseReact, createElement: element } } },
  });
  const theme = namespace.default({ code: "globaltheme", type: "radio", options: ["auto"], defaultValue: "auto" });
  const location = namespace.default({ code: "weatherlocationMode", type: "radio", options: ["auto"], defaultValue: "auto" });
  const themeId = walk(theme, (node) => node.type === "input").props.id;
  const locationId = walk(location, (node) => node.type === "input").props.id;
  assert.notEqual(themeId, locationId);
  assert.equal(walk(location, (node) => node.type === "label").props.htmlFor, locationId);
});
