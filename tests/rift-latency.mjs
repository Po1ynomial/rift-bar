// Opt-in live regression. Host-side cleanup restores all original workspaces
// and the focused window even if browser evaluation fails or the browser exits.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { planLatency, restoreDesktop } from "./helpers/latency-plan.mjs";

const configPath = join(homedir(), ".simplebarrc");
const settings = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
const cli = process.env.RIFT_CLI || settings.global?.riftPath || "/opt/homebrew/bin/rift-cli";
const session = "rift-latency-test";

function execute(args) {
  const result = spawnSync(cli, args, { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  return result.stdout;
}
function query(args) { return JSON.parse(execute(args)); }

function browser(...args) {
  const result = spawnSync("agent-browser", ["--session", session, "--json", ...args], {
    encoding: "utf8", timeout: 30000,
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  const response = JSON.parse(result.stdout);
  assert.ok(response.success, JSON.stringify(response.error));
  return response.data;
}

// This function is serialized and executed inside Übersicht's browser page.
async function measure(options) {
  const U = require("uebersicht");
  const quote = (value) => `'${String(value).replace(/'/g, `'"'"'`)}'`;
  const executable = quote(options.cli);
  const proto = XMLHttpRequest.prototype;
  const savedSend = proto.send;
  let nextSnapshot;
  let lastSnapshot;
  let snapshotCount = 0;
  const samples = [];
  const cleanups = new Set();
  proto.send = function (body) {
    if (typeof body === "string" && body.includes("init-rift.sh")) {
      snapshotCount++;
      const row = { start: performance.now() };
      this.addEventListener("loadend", () => {
        row.end = performance.now();
        lastSnapshot = row;
        nextSnapshot?.(row);
      }, { once: true });
    }
    return savedSend.apply(this, arguments);
  };

  function waitForSnapshot() {
    return new Promise((resolve, reject) => {
      const receive = (row) => { cleanup(); resolve(row); };
      const timer = setTimeout(() => { cleanup(); reject(new Error("Refresh did not run")); }, 4000);
      const cleanup = () => {
        clearTimeout(timer);
        if (nextSnapshot === receive) nextSnapshot = undefined;
        cleanups.delete(cleanup);
      };
      nextSnapshot = receive;
      cleanups.add(cleanup);
    });
  }

  function button(index) {
    const identity = CSS.escape(`${options.displayUuid}:${index}`);
    return document.querySelector(`.space__inner[data-workspace="${identity}"]`);
  }

  function waitForVisible(index) {
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(check);
      const timer = setTimeout(() => { cleanup(); reject(new Error("Workspace display did not update")); }, 4000);
      const cleanup = () => {
        clearTimeout(timer);
        observer.disconnect();
        cleanups.delete(cleanup);
      };
      function check() {
        if (button(index)?.closest(".space")?.classList.contains("space--focused")) {
          cleanup();
          resolve(performance.now());
        }
      }
      cleanups.add(cleanup);
      observer.observe(document.body, { attributes: true, subtree: true, childList: true, characterData: true });
      check();
    });
  }

  try {
    for (let i = 0; i < 6; i++) {
      const snapshot = waitForSnapshot();
      await U.run("/bin/sh simple-bar/lib/scripts/refresh-rift.sh");
      await snapshot;
      await new Promise((resolve) => setTimeout(resolve, 25));
      const target = i % 2 === 0 ? options.alternate : options.original;
      const element = button(target);
      if (!element) throw new Error(`Workspace button missing: ${options.displayUuid}:${target}`);
      const start = performance.now();
      const visible = waitForVisible(target);
      // Exercise the actual click handler, including target-display focus.
      element.click();
      const displayed = await visible;
      const row = lastSnapshot?.start >= start ? lastSnapshot : undefined;
      samples.push({
        displayUuid: options.displayUuid,
        workspaceIndex: target,
        waitForSnapshotMs: row ? Math.round(row.start - start) : null,
        snapshotMs: row ? Math.round(row.end - row.start) : null,
        renderingMs: row ? Math.round(displayed - row.end) : null,
        totalMs: Math.round(displayed - start),
      });
    }
    const displays = JSON.parse(await U.run(`${executable} query displays`));
    if (!displays.some((display) => display.uuid === options.displayUuid && display.is_active_context)) {
      throw new Error("Workspace click did not focus the target display");
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    const beforeIdle = snapshotCount;
    await new Promise((resolve) => setTimeout(resolve, 2200));
    return { samples, idleSnapshotQueries: snapshotCount - beforeIdle };
  } finally {
    for (const cleanup of [...cleanups]) cleanup();
    proto.send = savedSend;
  }
}

const displays = query(["query", "displays"]);
const workspaces = new Map(displays.filter((display) => display.space != null).map((display) => [
  display.uuid, query(["query", "workspaces", "--display", display.uuid]),
]));
const plan = planLatency(displays, workspaces, settings);
if (!plan.cases.length) {
  console.log("Skipped: no visible display has two usable workspaces.");
} else {
  let browserStarted = false;
  let desktopTouched = false;
  const failures = [];
  try {
    for (const item of plan.cases) {
      browserStarted = true;
      browser("open", `http://127.0.0.1:41416/${item.screenId}`);
      browser("wait", ".space__inner[data-workspace]");
      const options = { cli, displayUuid: item.displayUuid, original: item.original.index, alternate: item.alternate.index };
      desktopTouched = true;
      const data = browser("eval", `(${measure.toString()})(${JSON.stringify(options)})`);
      const { samples, idleSnapshotQueries } = data.result;
      console.log(JSON.stringify({ samples, idleSnapshotQueries }, null, 2));
      assert.equal(samples?.length, 6, "Missing timing samples");
      assert.ok(samples.every((sample) => sample.totalMs < 250), "Workspace bar update exceeded 250ms");
      assert.equal(idleSnapshotQueries, 0, "Workspace snapshots still poll while idle");
    }
  } catch (error) { failures.push(error); }
  finally {
    // Stop browser-side clicks before restoring, including after an eval timeout.
    if (browserStarted) {
      try { browser("close"); } catch (error) { failures.push(error); }
    }
    if (desktopTouched) {
      try { restoreDesktop(plan, query, execute); } catch (error) { failures.push(error); }
    }
  }
  if (failures.length) throw new AggregateError(failures, "Live latency regression failed");
}
