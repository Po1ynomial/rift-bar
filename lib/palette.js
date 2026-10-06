// Wallust palette integration. Palette files are written beside config.toml by
// wallust templates (see docs/wallust.md) and read along with the TOML config.
// This module is pure and dependency-free: config-file.mjs imports the file
// names, settings.js feeds it raw file texts, and theme.js reads the result.

const paletteFiles = { dark: "wallust-dark.json", light: "wallust-light.json" };

export const paletteFileName = (kind) => paletteFiles[kind];

export function emptyPaletteTexts() {
  return Object.fromEntries(Object.values(paletteFiles).map((name) => [name, ""]));
}

// Slot names accepted in palette files. Template variables map as follows:
// background/foreground stay literal, cursor becomes orange, and colorN slots
// take wallust color0..color15 by number.
const slots = new Set([
  "background",
  "foreground",
  "cursor",
  ...Array.from({ length: 16 }, (_, index) => `color${index}`),
]);
const hexColor = /^#[\da-f]{6}$/i;

/** Validate a raw palette file's text; returns undefined when unusable. */
export function parsePalette(text) {
  if (typeof text !== "string" || !text) return undefined;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const colors = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => slots.has(key) && typeof value === "string" && hexColor.test(value),
    ),
  );
  // Whole-file validity: a palette missing any required slot falls back to
  // the theme's base colors instead of mixing in undefined values.
  const required = [
    "background",
    "foreground",
    ...Array.from({ length: 16 }, (_, i) => `color${i}`),
  ];
  if (!required.every((key) => colors[key])) return undefined;
  return {
    main: colors.background,
    mainAlt: colors.foreground,
    minor: colors.color8,
    red: colors.color1,
    green: colors.color2,
    yellow: colors.color3,
    blue: colors.color4,
    magenta: colors.color5,
    cyan: colors.color6,
    orange: colors.cursor ?? colors.color9,
    black: colors.color0,
    white: colors.color15,
    foreground: colors.foreground,
  };
}

const canonicalPalette = (colors) =>
  colors &&
  JSON.stringify(
    Object.keys(colors)
      .sort()
      .map((key) => [key, colors[key].toLowerCase()]),
  );

let state = { themes: {}, stamp: "|" };

/** Replace the palette texts and return the resulting theme colors and stamp. */
export function setPaletteTexts(texts = {}) {
  const themes = {};
  for (const kind of ["dark", "light"]) {
    const colors = parsePalette(texts[paletteFiles[kind]]);
    if (colors) themes[kind === "dark" ? "WallustDark" : "WallustLight"] = colors;
  }
  state = {
    themes,
    stamp: `${canonicalPalette(themes.WallustDark)}|${canonicalPalette(themes.WallustLight)}`,
  };
  return state;
}

/** Theme colors supplied by valid palette files, keyed by theme name. */
export const paletteThemes = () => state.themes;

/** Fingerprint of the applied palettes; changes when any palette color does. */
export const paletteStamp = () => state.stamp;
