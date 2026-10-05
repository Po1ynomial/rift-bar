// Live regression test: briefly switches between two workspaces, then restores
// the initial workspace and focused window. Run explicitly, not in unit tests.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const session = "rift-latency-test";
function browser(...args) {
  const result = spawnSync("agent-browser", ["--session", session, "--json", ...args], {
    encoding: "utf8", timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const response = JSON.parse(result.stdout);
  assert.ok(response.success, JSON.stringify(response.error));
  return response.data;
}

async function measure() {
  const U = require("uebersicht");
  const cli = "/opt/homebrew/bin/rift-cli";
  const before = JSON.parse(await U.run(`${cli} query workspaces`));
  const original = before.find((w) => w.is_active);
  const focus = original.windows.find((w) => w.is_focused)?.id;
  const alternate = before.find((w) => w.index !== original.index);
  const proto = XMLHttpRequest.prototype;
  const savedSend = proto.send;
  let nextSnapshot;
  let lastSnapshot;
  const samples = [];
  let snapshotCount = 0;
  proto.send = function (body) {
    if (typeof body === "string" && body.includes("init-rift.sh")) {
      snapshotCount++;
      const row = { start: performance.now() };
      this.addEventListener("loadend", () => {
        row.end = performance.now();
        lastSnapshot = row;
        if (nextSnapshot) { nextSnapshot(row); nextSnapshot = undefined; }
      }, { once: true });
    }
    return savedSend.apply(this, arguments);
  };
  try {
    for (let i = 0; i < 6; i++) {
      // Refresh first so the old polling implementation is tested just after a
      // completed poll, when its one-second wait is reliably reproducible.
      const snapshot = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Refresh did not run")), 4000);
        nextSnapshot = (row) => { clearTimeout(timer); resolve(row); };
      });
      await U.run("/bin/sh simple-bar/lib/scripts/refresh-rift.sh");
      await snapshot;
      await new Promise((resolve) => setTimeout(resolve, 25));
      const target = i % 2 === 0 ? alternate : original;
      const start = performance.now();
      const visible = new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
          if (document.querySelector(".space--focused .space__inner")?.textContent.trim() === target.name) {
            clearTimeout(timer); observer.disconnect(); resolve(performance.now());
          }
        });
        const timer = setTimeout(() => { observer.disconnect(); reject(new Error("Workspace display did not update")); }, 4000);
        observer.observe(document.querySelector(".spaces"), { attributes: true, subtree: true, childList: true });
      });
      await U.run(`${cli} execute workspace switch ${target.index} >/dev/null && ${cli} query workspaces`);
      const ack = performance.now();
      const displayed = await visible;
      samples.push({
        riftRoundtripMs: Math.round(ack - start),
        waitForSnapshotMs: Math.round(lastSnapshot.start - start),
        snapshotMs: Math.round(lastSnapshot.end - lastSnapshot.start),
        renderingMs: Math.round(displayed - lastSnapshot.end),
        totalMs: Math.round(displayed - start),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    const beforeIdle = snapshotCount;
    await new Promise((resolve) => setTimeout(resolve, 2200));
    return { samples, idleSnapshotQueries: snapshotCount - beforeIdle };
  } finally {
    proto.send = savedSend;
    await U.run(`${cli} execute workspace switch ${original.index}`);
    if (focus) await U.run(`${cli} execute window focus --window-id '${JSON.stringify(focus)}'`);
  }
}

try {
  const displays = JSON.parse(spawnSync("rift-cli", ["query", "displays"], { encoding: "utf8" }).stdout);
  const display = displays.find((d) => d.is_active_context) || displays[0];
  browser("open", `http://127.0.0.1:41416/${display.screen_id}`);
  browser("wait", ".space--focused");
  const data = browser("eval", `(${measure.toString()})()`);
  const { samples, idleSnapshotQueries } = data.result;
  console.log(JSON.stringify({ samples, idleSnapshotQueries }, null, 2));
  assert.ok(Array.isArray(samples), "Missing timing samples");
  assert.ok(samples.every((s) => s.totalMs < 250), "Workspace bar update exceeded 250ms");
  assert.equal(idleSnapshotQueries, 0, "Workspace snapshots still poll while idle");
} finally {
  browser("close");
}
