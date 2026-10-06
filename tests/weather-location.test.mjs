import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React as baseReact } from "./helpers/modules.mjs";

// Exercise the real widget's loader without mounting its presentation.
test("weather never submits a placeholder city to a forecast endpoint", async () => {
  let load;
  const requests = [];
  const legacy = {
    widgets: { weatherWidget: true },
    weatherWidgetOptions: {
      refreshFrequency: 1800000,
      customLocation: "null",
      unit: "C",
      showOnDisplay: "",
    },
  };
  const preferences = await loadModule("lib/settings.js", {
    globals: { window: { localStorage: { getItem: () => JSON.stringify(legacy) } } },
    mocks: { uebersicht: { React: baseReact } },
  });
  const settings = preferences.namespace.get();
  const React = {
    ...baseReact,
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, () => {}],
  };
  const { namespace } = await loadModule("lib/components/data/weather.jsx", {
    globals: {
      fetch: async (url) => {
        requests.push(String(url));
        return { json: async () => ({}) };
      },
    },
    mocks: {
      uebersicht: { React },
      "../simple-bar-context.jsx": { useSimpleBarContext: () => ({ displayIndex: 1, settings }) },
      "../../hooks/use-widget.js": {
        default: (definition, active, config) => {
          if (active)
            load = () => definition.load({ config, signal: new AbortController().signal });
          return { data: undefined, status: "loading", refresh: () => {} };
        },
      },
    },
  });
  namespace.Widget();
  assert.equal(typeof load, "function");
  await assert.rejects(load(), /location|coordinates/);
  assert.deepEqual(requests, []);
});
