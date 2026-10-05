import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { SourceTextModule, SyntheticModule, createContext } from "node:vm";
import { parseSnapshot } from "../lib/snapshot.js";

async function loadBackend(run) {
  const calls = [];
  const context = createContext();
  const settings = { global: { riftPath: "/tmp/Rift's CLI" } };
  const dependencies = new Map([
    ["uebersicht", { run: async (command) => {
      calls.push(command);
      return run ? run(command, calls.length) : "{}";
    } }],
    ["./settings", { get: () => settings }],
    ["./snapshot.js", { parseSnapshot }],
  ]);
  const module = new SourceTextModule(
    await readFile(new URL("../lib/rift.js", import.meta.url), "utf8"),
    { context },
  );
  await module.link(async (specifier) => {
    const exports = dependencies.get(specifier);
    assert.ok(exports, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return { backend: module.namespace, rift: module.namespace, calls };
}

test("Rift commands quote paths and focus the target display before switching", async () => {
  const { backend, calls } = await loadBackend();
  await backend.goToSpace({ displayUuid: "display-two", index: 0, focused: false });
  assert.equal(calls[0], `'/tmp/Rift'"'"'s CLI' execute display focus --uuid 'display-two' && '/tmp/Rift'"'"'s CLI' execute workspace switch '0'`);
});

test("an active workspace only focuses its display", async () => {
  const { backend, calls } = await loadBackend();
  await backend.goToSpace({ displayUuid: "display-two", index: 3, focused: true });
  assert.ok(!calls[0].includes("workspace switch"));
});

test("window focus uses the complete Rift ID", async () => {
  const { backend, calls } = await loadBackend();
  await backend.focusWindow({ pid: 123, idx: 456 });
  assert.ok(calls[0].endsWith(`execute window focus --window-id '{"pid":123,"idx":456}'`));
});

test("event setup runs once per widget instance, snapshots run on every refresh", async () => {
  const { rift, calls } = await loadBackend();
  await Promise.all([rift.getSnapshot(), rift.getSnapshot()]);
  assert.equal(calls.length, 3);
  assert.ok(calls[0].includes("subscribe-rift.sh"));
  assert.ok(calls[1].includes("init-rift.sh"));
  assert.equal(calls[1], calls[2]);
});

test("failed subscription setup is retried instead of caching rejection", async () => {
  const { rift, calls } = await loadBackend(async (_command, count) => {
    if (count === 1) throw new Error("Rift is stopped");
    return "{}";
  });
  await assert.rejects(rift.getSnapshot(), /Rift is stopped/);
  assert.equal(await rift.getSnapshot(), "{}");
  assert.equal(calls.length, 3);
  assert.ok(calls[1].includes("subscribe-rift.sh"));
});

test("a stopped Rift snapshot invalidates setup so the next retry resubscribes", async () => {
  const { rift, calls } = await loadBackend(async (_command, count) => count === 2 ? "riftError\n" : "{}");
  assert.equal((await rift.getSnapshot()).trim(), "riftError");
  await rift.getSnapshot();
  assert.equal(calls.length, 4);
  assert.ok(calls[2].includes("subscribe-rift.sh"));
});

test("a rejected snapshot also invalidates subscription setup", async () => {
  const { rift, calls } = await loadBackend(async (_command, count) => {
    if (count === 2) throw new Error("Connection lost");
    return "{}";
  });
  await assert.rejects(rift.getSnapshot(), /Connection lost/);
  await rift.getSnapshot();
  assert.equal(calls.length, 4);
  assert.ok(calls[2].includes("subscribe-rift.sh"));
});

test("subscription script registers only relevant events and preserves other integrations", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simple-bar-rift-subscribe-"));
  try {
    const log = join(directory, "args.log");
    const mock = join(directory, "mock rift-cli");
    await writeFile(mock, `#!/bin/sh\nprintf '%s\\n' "$@" >> '${log}'\n`, { mode: 0o700 });
    const script = fileURLToPath(new URL("../lib/scripts/subscribe-rift.sh", import.meta.url));
    const result = spawnSync("sh", [script, mock], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const args = (await readFile(log, "utf8")).trim().split("\n");
    assert.equal(args.filter((arg) => arg === "subscribe").length, 4);
    assert.ok(!args.includes("unsub-cli"));
    for (const event of ["workspace_changed", "windows_changed", "focused_window_changed", "window_title_changed"]) {
      assert.ok(args.includes(event));
    }
    const callback = fileURLToPath(new URL("../lib/scripts/refresh-rift.sh", import.meta.url));
    assert.equal(args.filter((arg) => arg === callback).length, 4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("source and Übersicht symlink register identical subscription callbacks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rift-bar-symlink-subscribe-"));
  try {
    const log = join(directory, "args.log");
    const mock = join(directory, "mock rift-cli");
    await writeFile(mock, `#!/bin/sh\nprintf '%s\\n' "$@" >> '${log}'\n`, { mode: 0o700 });
    const script = fileURLToPath(new URL("../lib/scripts/subscribe-rift.sh", import.meta.url));
    const direct = spawnSync("sh", [script, mock], { encoding: "utf8" });
    assert.equal(direct.status, 0, direct.stderr);
    const sourceArgs = await readFile(log, "utf8");
    await writeFile(log, "");
    const link = join(directory, "linked scripts");
    await symlink(dirname(script), link);
    const linked = spawnSync("sh", [join(link, "subscribe-rift.sh"), mock], { encoding: "utf8" });
    assert.equal(linked.status, 0, linked.stderr);
    assert.equal(await readFile(log, "utf8"), sourceArgs);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("restart hook rebuilds subscriptions before requesting a refresh", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rift-bar-restart-"));
  try {
    const log = join(directory, "restart.log");
    const mock = join(directory, "rift-cli");
    await writeFile(mock, `#!/bin/sh\nprintf '%s\\n' "$@" >> '${log}'\n`, { mode: 0o700 });
    const script = join(directory, "subscribe-rift.sh");
    await writeFile(script, await readFile(new URL("../lib/scripts/subscribe-rift.sh", import.meta.url)));
    await writeFile(join(directory, "refresh-rift.sh"), `#!/bin/sh\nprintf '%s\\n' refreshed >> '${log}'\n`);
    for (let restart = 0; restart < 2; restart++) {
      await writeFile(log, "");
      const result = spawnSync("sh", [script, mock, "--refresh"], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      const lines = (await readFile(log, "utf8")).trim().split("\n");
      assert.equal(lines.filter((line) => line === "subscribe").length, 4);
      assert.equal(lines.at(-1), "refreshed");
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("snapshot preserves per-display workspace identity, names, and titles", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simple-bar-rift-test-"));
  try {
    const mock = join(directory, "mock rift-cli");
    const displays = [
      { uuid: "external", space: 3, screen_id: 7 },
      { uuid: "internal", space: 9, screen_id: 1 },
    ];
    const workspaces = [{
      index: 0, name: "Code's workspace", is_active: true,
      windows: [{ app_name: "kitty", title: "日本語 \"quoted\"\nnext line C:\\temp\\file ,]", id: { pid: 123, idx: 456 }, is_focused: true }],
    }, { index: 1, name: "Empty", is_active: false, windows: [] }];
    await writeFile(mock, `#!/bin/sh\ncase "$*" in\n  'query displays') printf '%s' '${JSON.stringify(displays)}' ;;\n  'query workspaces --space-id 3'|'query workspaces --space-id 9') printf '%s' '${JSON.stringify(workspaces).replace(/'/g, `'"'"'`)}' ;;\n  *) exit 1 ;;\nesac\n`, { mode: 0o700 });
    const script = fileURLToPath(new URL("../lib/scripts/init-rift.sh", import.meta.url));
    const result = spawnSync("sh", [script, mock], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const snapshot = parseSnapshot(result.stdout);
    assert.deepEqual(Object.keys(snapshot).sort(), ["displays", "spaces"]);
    assert.deepEqual(snapshot.displays.map(({ id, index }) => [id, index]), [[7, 1], [1, 2]]);
    assert.equal(snapshot.spaces.length, 4);
    assert.notEqual(snapshot.spaces[0].workspace, snapshot.spaces[2].workspace);
    assert.equal(snapshot.spaces[0].name, workspaces[0].name);
    assert.equal(snapshot.spaces[2].monitor, 2);
    assert.equal(snapshot.spaces[0].windows[0]["window-title"], workspaces[0].windows[0].title);
    assert.deepEqual(snapshot.spaces[0].windows[0]["window-id"], { pid: 123, idx: 456 });
    assert.deepEqual(snapshot.spaces[1].windows, []);
    const failure = spawnSync("sh", [script, join(directory, "missing")], { encoding: "utf8" });
    assert.equal(failure.status, 0);
    assert.equal(failure.stdout.trim(), "riftError");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
