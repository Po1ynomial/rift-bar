import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const widgets = [
  "battery", "browser-track", "cpu", "crypto", "date-display", "github", "gpu",
  "keyboard", "memory", "mic", "mpd", "music", "netstats", "next-meeting",
  "notifications", "sound", "spotify", "stock", "time", "user-widgets",
  "viscosity-vpn", "weather", "wifi", "youtube-music", "zoom",
];

for (const widget of widgets) {
  test(`${widget} retains data refresh without the optional server`, async () => {
    const source = await readFile(new URL(`../lib/components/data/${widget}.jsx`, import.meta.url), "utf8");
    assert.match(source, /useWidgetRefresh\(visible, \w+, \w+\)/);
    assert.doesNotMatch(source, /useServerSocket|use-server-socket/);
  });
}
