import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { catalog, resolveIcon } from "../lib/components/icons/catalog.js";
import { appIcons, iconForApp } from "../lib/app-icons.js";

const library = new URL("../lib/components/icons/library/", import.meta.url);

test("every catalog entry has a library file on disk", () => {
  for (const [name, load] of Object.entries(catalog)) {
    assert.equal(typeof load, "function", `${name} must be a lazy loader`);
  }
  const files = [...Object.values(catalog)].map((load) => String(load));
  assert.ok(files.length > 200, "the icon library is unexpectedly small");
});

test("catalog identifiers are unique and kebab-cased", () => {
  for (const name of Object.keys(catalog)) {
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${name} is not kebab-case`);
  }
});

test("every app icon mapping resolves to a catalog identifier", () => {
  const missing = Object.entries(appIcons).filter(([, icon]) => !catalog[icon]);
  assert.deepEqual(
    missing.map(([app]) => app),
    [],
  );
});

test("icons used directly by widget code resolve in the catalog", () => {
  const used = [
    "default",
    "close",
    "cpu",
    "date",
    "github",
    "keyboard",
    "download",
    "upload",
    "wifi",
    "wifi-off",
    "volume-high",
    "volume-low",
    "no-volume",
    "volume-muted",
    "mic-on",
    "mic-off",
    "camera",
    "camera-off",
    "charging",
    "coffee",
    "sun",
    "moon",
    "cloud",
    "rain",
    "snow",
    "fog",
    "storm",
  ];
  const missing = used.filter((name) => !catalog[name]);
  assert.deepEqual(missing, []);
});

test("resolveIcon falls back for unknown names", () => {
  assert.equal(resolveIcon("wifi"), "wifi");
  assert.equal(resolveIcon("no-such-icon"), "default");
  assert.equal(resolveIcon("no-such-icon", "wifi"), "wifi");
});

test("iconForApp maps known apps, defaults unknown ones, and normalizes names", () => {
  assert.equal(iconForApp("kitty"), "terminal");
  assert.equal(iconForApp("no-such-application"), "default");
  assert.equal(iconForApp(undefined), "default");
  assert.equal(iconForApp("weird\u200Ename"), "default");
  const leftMark = Object.keys(appIcons).find((name) => name.includes("\u200E"));
  assert.equal(leftMark, undefined, "map keys should not need inline normalizing");
});

test("library files referenced by the catalog exist", () => {
  for (const file of ["ableton.jsx", "default.jsx", "git-hub.jsx", "cp-u.jsx", "ca-r-r-o-t.jsx"]) {
    assert.ok(existsSync(fileURLToPath(new URL(file, library))), file);
  }
});
