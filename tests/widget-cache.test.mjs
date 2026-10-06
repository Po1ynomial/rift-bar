import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule, React } from "./helpers/modules.mjs";

function storage() {
  const entries = new Map();
  return {
    get length() { return entries.size; },
    key: (index) => [...entries.keys()][index],
    getItem: (key) => entries.get(key),
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
}
async function utilities(run, localStorage = storage()) {
  return (await loadModule("lib/utils.js", {
    globals: { localStorage }, mocks: { uebersicht: { React, run } },
  })).namespace;
}

test("concurrent collectors share one command and forced refresh updates its cache", async () => {
  let finish, calls = 0;
  const utils = await utilities(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const first = utils.cachedRun("read", 10000);
  const second = utils.cachedRun("read", 10000);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish("old");
  assert.deepEqual(await Promise.all([first, second]), ["old", "old"]);
  assert.equal(await utils.cachedRun("read", 10000), "old");
  const refresh = utils.cachedRun("read", 10000, { force: true });
  await Promise.resolve();
  assert.equal(calls, 2);
  finish("new"); await refresh;
  assert.equal(await utils.cachedRun("read", 10000), "new");
  assert.equal(calls, 2);
});

test("completed readings are reused through shared storage across display instances", async () => {
  const shared = storage();
  const first = await utilities(async () => "reading", shared);
  const second = await utilities(() => assert.fail("Must reuse shared result"), shared);
  await first.cachedRun("read", 10000);
  assert.equal(await second.cachedRun("read", 10000), "reading");
});

test("failed commands do not poison the in-flight cache", async () => {
  let attempts = 0;
  const utils = await utilities(async () => {
    if (++attempts === 1) throw new Error("Command failed");
    return "recovered";
  });
  await assert.rejects(utils.cachedRun("read", 10000), /failed/);
  assert.equal(await utils.cachedRun("read", 10000), "recovered");
});

test("collectors still work when browser storage is unavailable", async () => {
  const utils = await utilities(async () => "reading", {
    get length() { throw new Error("No storage"); },
    getItem: () => { throw new Error("No storage"); },
    setItem: () => { throw new Error("No storage"); },
  });
  assert.equal(await utils.cachedRun("read", 10000), "reading");
});
