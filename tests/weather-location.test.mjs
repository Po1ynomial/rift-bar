import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../lib/config.js";
import { loadModule, React } from "./helpers/modules.mjs";

test("incomplete configured coordinates are rejected before any forecast request", () => {
  assert.throws(
    () =>
      resolveConfig({
        widgets: {
          weather: { enabled: true, location_mode: "configured", location: { label: "null" } },
        },
      }),
    /requires latitude and longitude/,
  );
});

test("automatic weather without geolocation never forecasts a placeholder city", async () => {
  let load;
  const requests = [];
  const settings = resolveConfig({ widgets: { weather: { enabled: true } } });
  const { namespace } = await loadModule("lib/components/data/weather.jsx", {
    globals: {
      AbortController,
      DOMException,
      setTimeout,
      clearTimeout,
      fetch: async (url) => {
        requests.push(String(url));
        return {};
      },
    },
    mocks: {
      uebersicht: { React },
      "../rift-bar-context.jsx": {
        useRiftBarContext: () => ({ displayUuid: "display", settings }),
      },
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
  await assert.rejects(load(), /Geolocation is unavailable/);
  assert.deepEqual(requests, []);
});
