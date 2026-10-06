#!/usr/bin/env node
// Query each display's native Space, including its inactive virtual workspaces,
// and print the snapshot envelope consumed by lib/snapshot.js.
// Failures print "riftError" and exit 0 so the bar shows its error view.
import { spawnSync } from "node:child_process";
import { buildSnapshot, buildSpaces } from "../snapshot-build.js";

const cli = process.argv[2] || "/opt/homebrew/bin/rift-cli";

function query(args) {
  const result = spawnSync(cli, ["query", ...args], { encoding: "utf8", maxBuffer: 64 * 2 ** 20 });
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
  return JSON.parse(result.stdout);
}

try {
  const displays = query(["displays"]);
  if (!Array.isArray(displays)) throw new TypeError("Invalid displays response");
  let spaces = [];
  let monitor = 0;
  for (const display of displays) {
    if (display?.space == null) continue;
    monitor++;
    spaces = buildSpaces(
      spaces,
      query(["workspaces", "--space-id", String(display.space)]),
      display.uuid,
      monitor,
    );
  }
  process.stdout.write(JSON.stringify(buildSnapshot(displays, spaces)));
} catch {
  process.stdout.write("riftError\n");
}
