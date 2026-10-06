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
  test(`theme shortcut ${fails ? "does not refresh after a failed save" : "awaits the save before refreshing"}`, async () => {
    let handleKeydown;
    const events = [];
    const { namespace } = await loadModule("lib/components/settings/settings.jsx", {
      mocks: {
        uebersicht: {
          React: {
            ...React,
            useCallback: (callback) => {
              handleKeydown = callback;
              return callback;
            },
            useState: () => [false, () => {}],
            useEffect: () => {},
          },
          run: async () => "",
        },
        "../simple-bar-context.jsx": { useSimpleBarContext: () => ({ pushMissive: () => {} }) },
        "../../settings": {
          get: () => ({ global: { theme: "dark" } }),
          set: async () => {
            events.push("save");
            if (fails) throw new Error("Cannot persist");
            await new Promise((resolve) => setImmediate(resolve));
            events.push("saved");
          },
        },
        "../../utils": {
          notification: (message) => events.push(message),
          hardRefresh: async () => events.push("refresh"),
        },
      },
    });
    namespace.Wrapper();
    await handleKeydown({ key: "t", metaKey: true, preventDefault() {} });
    if (fails) {
      assert.ok(!events.includes("refresh"));
      assert.ok(events.some((event) => event.startsWith("Cannot save preferences")));
    } else {
      assert.ok(events.indexOf("saved") < events.indexOf("refresh"));
    }
  });
}
