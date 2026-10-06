import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./helpers/modules.mjs";

import { createHookHarness } from "./helpers/hooks.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function setup() {
  const harness = createHookHarness();
  const timers = new Map();
  let id = 0;
  const loaded = await loadModule("lib/hooks/use-widget.js", {
    globals: {
      AbortController,
      setTimeout: (fn) => {
        timers.set(++id, fn);
        return id;
      },
      clearTimeout: (key) => timers.delete(key),
    },
    mocks: { uebersicht: { React: harness.React } },
  });
  return { harness, timers, useWidget: loaded.namespace.default };
}

test("the React adapter cancels replaced configuration and ignores late results", async () => {
  const { harness, timers, useWidget } = await setup();
  const requests = [];
  const definition = {
    id: "test",
    refreshFrequency: 1000,
    load: ({ config, signal }) =>
      new Promise((resolve) => requests.push({ config, signal, resolve })),
  };
  const first = { city: "old" },
    second = { city: "new" };
  harness.render(useWidget, definition, true, first);
  await flush();
  harness.render(useWidget, definition, true, second);
  await flush();
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve({ city: "new" });
  await flush();
  requests[0].resolve({ city: "old" });
  await flush();
  assert.equal(harness.render(useWidget, definition, true, second).data.city, "new");
  harness.unmount();
  assert.equal(timers.size, 0);
});

test("disabled widgets never query and unmount never publishes late data", async () => {
  const { harness, timers, useWidget } = await setup();
  let finish,
    calls = 0;
  const definition = {
    id: "test",
    refreshFrequency: 1000,
    load: () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  };
  const config = {};
  harness.render(useWidget, definition, false, config);
  await flush();
  assert.equal(calls, 0);
  harness.render(useWidget, definition, true, config);
  await flush();
  assert.equal(calls, 1);
  harness.unmount();
  const writes = harness.writes;
  finish({ value: 1 });
  await flush();
  assert.equal(harness.writes, writes);
  assert.equal(timers.size, 0);
});
