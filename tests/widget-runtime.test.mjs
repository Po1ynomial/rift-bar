import assert from "node:assert/strict";
import { test } from "node:test";
import { createWidgetResource, defineWidget, WidgetUnavailable } from "../lib/widgets/runtime.js";

function timers() {
  const pending = new Map();
  let id = 0;
  return {
    pending,
    setTimeout: (fn, delay) => { pending.set(++id, { fn, delay }); return id; },
    clearTimeout: (key) => pending.delete(key),
    fire(delay) {
      const entry = [...pending].find(([, value]) => value.delay === delay);
      assert.ok(entry, `Missing ${delay}ms timer`);
      pending.delete(entry[0]); entry[1].fn();
    },
  };
}
const definition = (load) => defineWidget({ id: "test", refreshFrequency: 2000, load });

test("one in-flight load, signal propagation, and no publication after cleanup", async () => {
  let finish, calls = 0, signal;
  const updates = [];
  const clock = timers();
  const resource = createWidgetResource(definition((context) => {
    calls++; signal = context.signal;
    return new Promise((resolve) => { finish = resolve; });
  }), {}, { timers: clock, onChange: (value) => updates.push(value) });
  const first = resource.refresh();
  await Promise.resolve();
  const second = resource.refresh();
  assert.equal(calls, 1);
  resource.stop();
  assert.equal(signal.aborted, true);
  const before = updates.length;
  finish({ value: 42 });
  await Promise.all([first, second]);
  assert.equal(updates.length, before);
  assert.equal(clock.pending.size, 0);
});

test("successful loads settle loading and refreshes preserve data", async () => {
  let value = 0;
  const clock = timers();
  const resource = createWidgetResource(definition(() => ({ value: ++value })), {}, { timers: clock });
  await resource.refresh();
  assert.equal(resource.state.status, "ready");
  assert.deepEqual(resource.state.data, { value: 1 });
  assert.equal([...clock.pending.values()][0].delay, 2000);
  const refresh = resource.refresh();
  assert.equal(resource.state.status, "refreshing");
  assert.deepEqual(resource.state.data, { value: 1 });
  await refresh;
  assert.deepEqual(resource.state.data, { value: 2 });
  resource.stop();
});

test("failure keeps the last good snapshot stale and recovery clears errors", async () => {
  let fail = false;
  const clock = timers();
  const resource = createWidgetResource(definition(() => {
    if (fail) throw new Error("Offline");
    return { value: 1 };
  }), {}, { timers: clock });
  await resource.refresh(); fail = true;
  await resource.refresh();
  assert.equal(resource.state.status, "stale");
  assert.equal(resource.state.error.message, "Offline");
  assert.deepEqual(resource.state.data, { value: 1 });
  fail = false; await resource.refresh();
  assert.equal(resource.state.status, "ready");
  assert.equal(resource.state.error, undefined);
  resource.stop();
});

test("missing dependencies are unavailable rather than loading forever", async () => {
  const resource = createWidgetResource(definition(() => { throw new WidgetUnavailable("Missing command"); }));
  await resource.refresh();
  assert.equal(resource.state.status, "unavailable");
  resource.stop();
});

test("a timeout exits loading, aborts, and does not overlap a stuck collector", async () => {
  let finish, signal, calls = 0;
  const clock = timers();
  const resource = createWidgetResource(definition((context) => {
    calls++; signal = context.signal;
    return new Promise((resolve) => { finish = resolve; });
  }), {}, { timers: clock, timeoutMs: 50 });
  const work = resource.refresh(); await Promise.resolve();
  clock.fire(50);
  assert.equal(signal.aborted, true);
  assert.equal(resource.state.status, "error");
  resource.refresh();
  assert.equal(calls, 1);
  finish({ value: 1 }); await work;
  assert.equal(resource.state.data, undefined, "late success must not replace timeout");
  resource.stop();
});

test("invalid intervals cannot create a tight polling loop", async () => {
  for (const refreshFrequency of [0, -1, NaN, Infinity]) {
    const clock = timers();
    const resource = createWidgetResource(definition(() => null), { refreshFrequency }, { timers: clock });
    await resource.refresh();
    assert.equal([...clock.pending.values()][0].delay, 2000);
    resource.stop();
  }
});
