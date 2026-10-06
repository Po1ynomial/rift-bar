import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import failuresOnly from "../tools/failures-only.mjs";

const reporter = resolve("tools/failures-only.mjs");
const quiet = resolve("tools/quiet-command.mjs");
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;

async function fixture(source, callback, options = []) {
  const directory = await mkdtemp(join(tmpdir(), "rift-reporting-"));
  try {
    const file = join(directory, "fixture.test.mjs");
    await writeFile(file, source);
    const result = spawnSync(
      process.execPath,
      ["--test", `--test-reporter=${reporter}`, ...options, file],
      {
        encoding: "utf8",
        timeout: 10000,
        env,
      },
    );
    assert.equal(result.error, undefined);
    callback(result, result.stdout + result.stderr);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function render(events) {
  let output = "";
  for await (const chunk of failuresOnly(events)) output += chunk;
  return output;
}

test("successful tests are silent even with stdout, stderr, warnings, and skips", async () => {
  await fixture(
    `import {test} from 'node:test';
    test('green',()=>{console.log('stdout');console.error('stderr');process.emitWarning('warning');});
    test.skip('skipped',()=>{});`,
    (result, output) => {
      assert.equal(result.status, 0);
      assert.equal(output, "");
    },
  );
});

test("assertion failures retain names, diffs, stacks, file logs, and failure status", async () => {
  await fixture(
    `import {test} from 'node:test'; import assert from 'node:assert/strict';
    test('named failure',()=>{console.error('important log'); assert.deepEqual({actual:1},{expected:2});});`,
    (result, output) => {
      assert.notEqual(result.status, 0);
      for (const text of [
        "named failure",
        "important log",
        "actual",
        "expected",
        "AssertionError",
        "fixture.test.mjs",
      ])
        assert.ok(output.includes(text), text);
      assert.ok(!output.includes("✔"));
    },
  );
});

for (const [name, source] of [
  ["syntax error before test registration", "this is invalid JavaScript!"],
  ["module loading failure", "import './absent-module.mjs';"],
  ["process crash", "console.error('crash details'); process.exit(7);"],
]) {
  test(`the reporter cannot hide ${name}`, async () => {
    await fixture(source, (result, output) => {
      assert.notEqual(result.status, 0);
      assert.match(output, /FAIL|Tests failed/);
      assert.match(output, /SyntaxError|ERR_MODULE_NOT_FOUND|crash details/);
    });
  });
}

test("timeouts remain failures", async () => {
  await fixture(
    "import {test} from 'node:test'; test('times out',{timeout:30},async()=>new Promise(resolve=>setTimeout(resolve,200)));",
    (result, output) => {
      assert.notEqual(result.status, 0);
      assert.match(output, /times out/);
      assert.match(output, /timed out|testTimeoutFailure/i);
    },
  );
});

test("cancellation and setup-hook failures remain visible", async () => {
  await fixture(
    "import {test} from 'node:test'; const controller=new AbortController(); test('cancelled',{signal:controller.signal},async()=>new Promise(resolve=>setTimeout(resolve,100))); setTimeout(()=>controller.abort(),20);",
    (result, output) => {
      assert.notEqual(result.status, 0);
      assert.match(output, /cancelled|aborted/i);
    },
  );
  await fixture(
    "import {test,before} from 'node:test'; before(()=>{throw new Error('setup failed')}); test('cannot start',()=>{});",
    (result, output) => {
      assert.notEqual(result.status, 0);
      assert.match(output, /setup failed/);
    },
  );
});

test("logs from a passing file stay hidden when another file fails", async () => {
  const output = await render([
    { type: "test:stdout", data: { file: "passing.mjs", message: "pass noise\n" } },
    { type: "test:summary", data: { file: "passing.mjs", success: true } },
    { type: "test:stderr", data: { file: "failing.mjs", message: "useful failure log\n" } },
    {
      type: "test:fail",
      data: { file: "failing.mjs", name: "fails", details: { error: new Error("bad") } },
    },
    { type: "test:summary", data: { success: false, counts: { failed: 1, cancelled: 0 } } },
  ]);
  assert.ok(!output.includes("pass noise"));
  assert.match(output, /useful failure log/);
});

test("buffer limits are explicit and a failed summary cannot disappear", async () => {
  const log = "x".repeat(40000);
  const output = await render([
    { type: "test:stderr", data: { file: "failing.mjs", message: log } },
    {
      type: "test:fail",
      data: { file: "failing.mjs", name: "fails", details: { error: new Error("bad") } },
    },
  ]);
  assert.match(output, /truncated/);
  assert.ok(output.length < 35000);
  assert.match(
    await render([
      { type: "test:summary", data: { success: false, counts: { failed: 0, cancelled: 1 } } },
    ]),
    /1 cancelled/,
  );
});

test("errors in the reporter's event source propagate rather than looking successful", async () => {
  async function* broken() {
    yield Promise.reject(new Error("Reporter source failed"));
  }
  await assert.rejects(render(broken()), /Reporter source failed/);
});

function command(args) {
  return spawnSync(process.execPath, [quiet, ...args], { encoding: "utf8", timeout: 10000, env });
}

test("quiet tool commands suppress successful output but retain failure output and status", () => {
  const pass = command([process.execPath, "-e", "console.log('success');console.error('warning')"]);
  assert.equal(pass.status, 0);
  assert.equal(pass.stdout + pass.stderr, "");
  const fail = command([
    process.execPath,
    "-e",
    "console.log('details');console.error('failure');process.exit(7)",
  ]);
  assert.equal(fail.status, 7);
  assert.match(fail.stdout, /details/);
  assert.match(fail.stderr, /failure/);
});

test("quiet tool commands do not hide launch failures or signal termination", () => {
  const missing = command(["rift-nonexistent-command"]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /ENOENT/);
  const terminated = command([process.execPath, "-e", "process.kill(process.pid,'SIGTERM')"]);
  assert.equal(terminated.status, 143);
  assert.match(terminated.stderr, /SIGTERM/);
});
