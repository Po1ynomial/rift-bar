import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyPaletteTexts,
  paletteFileName,
  paletteStamp,
  paletteThemes,
  parsePalette,
  setPaletteTexts,
} from "../lib/palette.js";
import { definition } from "../lib/config.js";
import { collection } from "../lib/styles/themes.js";
import { loadModule } from "./helpers/modules.mjs";

// theme.js merges whatever paletteThemes() supplies; mock it in its realm.
const themeColors = async (appearance, palettes = {}) =>
  (
    await loadModule("lib/styles/theme.js", {
      mocks: { "../palette.js": { paletteThemes: () => palettes } },
    })
  ).namespace.colors(appearance);

const wallustPalette = (overrides = {}) => ({
  background: "#112233",
  foreground: "#ddeeff",
  cursor: "#a1b2c3",
  ...Object.fromEntries(
    Array.from({ length: 16 }, (_, index) => [
      `color${index}`,
      `#${String(index).padStart(2, "0")}0000`,
    ]),
  ),
  ...overrides,
});

test("palette file names sit beside the TOML configuration", () => {
  assert.equal(paletteFileName("dark"), "wallust-dark.json");
  assert.equal(paletteFileName("light"), "wallust-light.json");
  assert.deepEqual(emptyPaletteTexts(), {
    "wallust-dark.json": "",
    "wallust-light.json": "",
  });
});

test("a valid wallust palette maps onto theme color slots", () => {
  const colors = parsePalette(JSON.stringify(wallustPalette()));
  assert.equal(colors.main, "#112233");
  assert.equal(colors.mainAlt, "#ddeeff");
  assert.equal(colors.foreground, "#ddeeff");
  assert.equal(colors.minor, "#080000");
  assert.equal(colors.red, "#010000");
  assert.equal(colors.cyan, "#060000");
  assert.equal(colors.orange, "#a1b2c3");
  assert.equal(colors.black, "#000000");
  assert.equal(colors.white, "#150000");
});

test("palette validation rejects malformed, incomplete, and non-hex content", () => {
  assert.equal(parsePalette(""), undefined);
  assert.equal(parsePalette("not json"), undefined);
  assert.equal(parsePalette('["#112233"]'), undefined);
  assert.equal(parsePalette(JSON.stringify({ background: "#112233" })), undefined);
  const tampered = wallustPalette({ color3: "red", color7: "#12345" });
  assert.equal(parsePalette(JSON.stringify(tampered)), undefined);
});

test("palette state keys theme colors and fingerprints every color change", () => {
  const empty = setPaletteTexts(emptyPaletteTexts());
  assert.deepEqual(empty.themes, {});
  const dark = setPaletteTexts({ "wallust-dark.json": JSON.stringify(wallustPalette()) });
  assert.equal(paletteThemes().WallustDark.main, "#112233");
  assert.equal(paletteThemes().WallustLight, undefined);
  assert.notEqual(dark.stamp, empty.stamp);
  const changed = setPaletteTexts({
    "wallust-dark.json": JSON.stringify(wallustPalette({ color1: "#ff0000" })),
  });
  assert.notEqual(changed.stamp, dark.stamp);
  assert.notEqual(paletteStamp(), empty.stamp);
  setPaletteTexts(emptyPaletteTexts());
  assert.equal(paletteStamp(), empty.stamp);
});

test("wallust themes are registered per appearance and merge palette colors", async () => {
  const enums = definition.properties.appearance.properties;
  assert.ok(enums.dark_theme.enum.includes("WallustDark"));
  assert.ok(!enums.dark_theme.enum.includes("WallustLight"));
  assert.ok(enums.light_theme.enum.includes("WallustLight"));
  const themes = await themeColors(
    { dark_theme: "WallustDark", light_theme: "WallustLight" },
    { WallustDark: { main: "#112233" }, WallustLight: { main: "#fafafa" } },
  );
  assert.equal(themes.dark.main, "#112233");
  assert.equal(themes.light.main, "#fafafa");
  assert.equal(themes.dark.name, "Wallust Dark");
  assert.equal(themes.dark.kind, "dark");
  assert.equal(themes.dark.barHeight, collection.NightShiftDark.barHeight);
  const fallback = await themeColors({ dark_theme: "WallustDark", light_theme: "WallustLight" });
  assert.equal(fallback.dark.main, collection.NightShiftDark.main);
});
