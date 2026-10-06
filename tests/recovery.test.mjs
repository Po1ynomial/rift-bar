import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React } from "./helpers/modules.mjs";

// A single-effect runner executes cleanup on dependency changes and unmount.
function effects() {
  let previous;
  let cleanup;
  return {
    useEffect(callback, dependencies) {
      if (!previous || dependencies.some((value, i) => value !== previous[i])) {
        cleanup?.();
        previous = dependencies;
        cleanup = callback();
      }
    },
    unmount() {
      cleanup?.();
    },
  };
}

test("error recovery schedules one timer and cleans it on state changes and unmount", async () => {
  const lifecycle = effects();
  const timers = new Map();
  let id = 0;
  let refreshes = 0;
  const { namespace } = await loadModule("lib/components/error.jsx", {
    globals: {
      setTimeout: (callback, delay) => {
        timers.set(++id, { callback, delay });
        return id;
      },
      clearTimeout: (timer) => timers.delete(timer),
    },
    mocks: {
      uebersicht: {
        React: { ...React, useEffect: lifecycle.useEffect },
        run: async () => {
          if (++refreshes === 1) throw new Error("Übersicht is restarting");
          return "";
        },
      },
    },
  });
  namespace.Component({ type: "error" });
  namespace.Component({ type: "error" });
  namespace.Component({ type: "error" });
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 2000);
  const [expiredId, expired] = [...timers][0];
  timers.delete(expiredId);
  await expired.callback();
  assert.equal(
    timers.size,
    1,
    "same-type failures must continue retrying even after a failed refresh",
  );
  namespace.Component({ type: "riftError" });
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 15000);
  namespace.Component({ type: "noOutput" });
  assert.equal(timers.size, 0);
  namespace.Component({ type: "noData" });
  assert.equal(timers.size, 1);
  const retrying = [...timers.values()][0].callback();
  lifecycle.unmount();
  await retrying;
  assert.equal(timers.size, 0, "an in-flight retry must not reschedule after unmount");
});

for (const fails of [false, true]) {
  test(`theme shortcut ${fails ? "retains an inline error without refreshing" : "saves one override before refreshing"}`, async () => {
    let handleKeydown, error, saved;
    const events = [];
    const state = {
      settings: { appearance: { theme: "dark" } },
      overrides: { bar: { floating: true } },
    };
    const { namespace } = await loadModule("lib/components/settings/settings.jsx", {
      mocks: {
        uebersicht: {
          React: {
            ...React,
            useCallback: (fn) => {
              handleKeydown = fn;
              return fn;
            },
            useState: () => [
              false,
              (value) => {
                error = value;
              },
            ],
            useEffect: () => {},
          },
        },
        "../../settings.js": {
          getState: () => state,
          set: async (overrides, expected) => {
            assert.equal(expected, state);
            saved = overrides;
            events.push("save");
            if (fails) throw new Error("Cannot persist");
            await new Promise((resolve) => setImmediate(resolve));
            events.push("saved");
          },
        },
        "../../utils.js": { softRefresh: async () => events.push("refresh") },
      },
    });
    namespace.Wrapper();
    await handleKeydown({ key: "t", metaKey: true, preventDefault() {} });
    assert.equal(saved.appearance.theme, "light");
    assert.equal(saved.bar.floating, true);
    if (fails) {
      assert.ok(!events.includes("refresh"));
      assert.equal(error, "Cannot persist");
    } else assert.ok(events.indexOf("saved") < events.indexOf("refresh"));
  });
}
