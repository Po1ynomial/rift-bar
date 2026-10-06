import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadModule, React } from "./helpers/modules.mjs";

const widgets = [
  "battery", "cpu", "date-display", "github", "keyboard", "memory", "mic",
  "netstats", "notifications", "sound", "time", "user-widgets", "weather", "wifi", "zoom",
];
const removed = [
  "gpu", "next-meeting", "crypto", "stock", "spotify", "youtube-music",
  "music", "mpd", "browser-track", "viscosity-vpn", "specter",
];

for (const widget of widgets) {
  test(`${widget} delegates its lifecycle rather than scheduling its own refreshes`, async () => {
    const source = await readFile(new URL(`../lib/components/data/${widget}.jsx`, import.meta.url), "utf8");
    assert.match(source, /useWidget\(definition, visible, /);
    assert.doesNotMatch(source, /setTimeout|setInterval|useWidgetRefresh|useServerSocket/);
  });
}

for (const widget of removed) {
  test(`${widget} has no remaining component or stylesheet`, async () => {
    await assert.rejects(access(new URL(`../lib/components/data/${widget}.jsx`, import.meta.url)), { code: "ENOENT" });
    await assert.rejects(access(new URL(`../lib/styles/components/data/${widget}.js`, import.meta.url)), { code: "ENOENT" });
  });
}

function output(command) {
  if (command.startsWith("top ")) return "35";
  if (command.startsWith("vm_stat")) return "60";
  if (command.includes("netstats.sh")) return '{"download":100,"upload":50}';
  if (command.includes("command -v")) return "present";
  if (command.includes("api notifications")) return '[{"id":"notification"}]';
  if (command.startsWith("ifconfig")) return "active";
  if (command.startsWith("system_profiler")) return "<redacted>";
  if (command.startsWith("defaults read")) return '"US";';
  if (command.includes("grep -Eo")) return "81";
  if (command.includes("AC Power")) return "AC";
  if (command.includes("lowpowermode")) return "0";
  if (command === "pgrep caffeinate") return "";
  if (command.startsWith("uname")) return "arm64";
  if (command.includes("zoom-mute")) return "on";
  if (command.includes("zoom-video")) return "off";
  if (command.includes("output volume of v")) return "35,true";
  if (command.includes("input volume")) return "20";
  assert.fail(`Unexpected collector command: ${command}`);
}

for (const name of ["time", "date", "cpu", "memory", "netstats", "battery", "wifi", "keyboard", "sound", "mic", "github", "zoom"]) {
  test(`${name} produces a validated snapshot through the real resource runtime`, async () => {
    const { namespace: definitions } = await loadModule("lib/widgets/system.js", {
      mocks: { uebersicht: { React, run: async (command) => output(command) } },
    });
    const { namespace: settings } = await loadModule("lib/settings.js", { mocks: { uebersicht: { React } } });
    const section = name === "wifi" ? "networkWidgetOptions" : `${name}WidgetOptions`;
    const { createWidgetResource } = await import("../lib/widgets/runtime.js");
    const resource = createWidgetResource(definitions[name], settings.defaultSettings[section]);
    try {
      await resource.refresh();
      assert.equal(resource.state.status, "ready", resource.state.error?.message);
      assert.equal(definitions[name].validate(resource.state.data), true);
    } finally { resource.stop(); }
  });
}


for (const raw of ["19, false\n", " 19 , true \n", "0,false\n", "100,true\n"]) {
  test("sound trims serialized fields: " + JSON.stringify(raw), async () => {
    const { namespace } = await loadModule("lib/widgets/system.js", {
      mocks: { uebersicht: { React, run: async () => raw } },
    });
    const data = await namespace.sound.load({ config: {}, force: true });
    assert.equal(namespace.sound.validate(data), true);
    const [volume, muted] = raw.trim().split(",").map((field) => field.trim());
    assert.equal(data.volume, volume);
    assert.equal(data.muted, muted);
  });
}

test("sound still rejects list serialization rather than weakening the validator", async () => {
  const { namespace } = await loadModule("lib/widgets/system.js", {
    mocks: { uebersicht: { React, run: async () => "19, ,, false\n" } },
  });
  const data = await namespace.sound.load({ config: {}, force: true });
  assert.equal(namespace.sound.validate(data), false);
});
