import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  defaultSettings,
  definition,
  controls,
  editOverride,
  getPath,
  parseConfig,
  previewConfig,
  rebaseOverrides,
  resolveConfig,
  serializeConfig,
} from "../lib/config.js";
import { schema, reference } from "../tools/config-reference.mjs";
import { loadModule, React } from "./helpers/modules.mjs";

test("TOML is a sparse recursive override; arrays replace and explicit false/zero/empty survive", () => {
  const overrides = parseConfig(
    '[bar]\nbackground = false\n[widgets.keyboard]\nmax_characters = 0\n[widgets.date]\ncalendar_app = ""\n[windows]\nexclude_apps = ["Finder"]\n',
  );
  const effective = resolveConfig(overrides);
  assert.equal(effective.bar.background, false);
  assert.equal(effective.widgets.keyboard.max_characters, 0);
  assert.equal(effective.widgets.date.calendar_app, "");
  assert.deepEqual(effective.windows.exclude_apps, ["Finder"]);
  assert.equal(effective.appearance.font_size, "11px");
  assert.deepEqual(parseConfig(serializeConfig(overrides)), overrides);
  assert.ok(!("appearance" in overrides));
});

test("editing a field preserves pins and reset removes only that override and empty tables", () => {
  const original = {
    appearance: { font_size: "11px" },
    widgets: { clock: { style: { background: "red" } } },
  };
  const edited = editOverride(original, "appearance.theme", "dark");
  assert.deepEqual(edited.appearance, { font_size: "11px", theme: "dark" });
  const reset = editOverride(edited, "widgets.clock.style.background", undefined);
  assert.ok(!("widgets" in reset));
  assert.equal(original.widgets.clock.style.background, "red");
  assert.equal(serializeConfig({}), "");
  assert.equal(serializeConfig({ bar: { colors: {} } }), "");
});

test("explicit reload rebases only GUI edits, preserving unrelated external overrides", () => {
  const base = { appearance: { font_size: "11px" }, bar: { floating: false } };
  const draft = editOverride(base, "appearance.font_size", "13px");
  const external = {
    appearance: { font_size: "15px", theme: "dark" },
    widgets: { weather: { enabled: true } },
    bar: { floating: true },
  };
  const result = rebaseOverrides(base, draft, external);
  assert.equal(result.appearance.font_size, "13px");
  assert.equal(result.appearance.theme, "dark");
  assert.equal(result.bar.floating, true);
  assert.equal(result.widgets.weather.enabled, true);
  const removed = rebaseOverrides(
    base,
    editOverride(base, "appearance.font_size", undefined),
    external,
  );
  assert.ok(!("font_size" in removed.appearance));
  assert.equal(external.appearance.font_size, "15px");
});

for (const [source, error] of [
  ['[global]\nfontSize = "12px"', /unknown field/],
  ["[custom_widgets]", /unknown field/],
  ['[bar]\nposition = "bottom"', /bar.position/],
  ["[bar]\ncompact = true", /bar.compact/],
  ['[bar]\nheight = "34px"', /bar.height/],
  ['[bar]\nforeground_height = "0px"', /CSS length/],
  ['[bar]\nforeground_height = "25%"', /CSS length/],
  ["[workspaces]\nenabled = false", /workspaces.enabled/],
  ['[widgets.clock.style]\nfont_size = "20px"', /font_size/],
  ['[appearance]\nfont_size = "0px"', /CSS length/],
  ['[bar]\npadding = "-1px"', /CSS padding/],
  ["[bar]\nforeground_height = 32", /expected string/],
  ['[appearance]\ntheme = "dakr"', /choose/],
  ['[appearance]\ndark_theme = "NightShiftLight"', /choose/],
  ["[widgets.clock]\nrefresh_ms = 0", /between/],
  ['[widgets.clock]\nrefresh_ms = "1000"', /expected number/],
  ["[widgets.cpu]\nhide_below_percent = 101", /between/],
  ["[widgets.weather.location]\nlatitude = 20", /together/],
  ['[widgets.weather]\nlocation_mode = "configured"', /requires/],
  ["[widgets.weather.location]\nlatitude = 91\nlongitude = 0", /latitude/],
  ['[widgets.date]\nlocale = "not_locale!"', /locale/],
  ['[widgets.github]\nurl = "file:///etc/passwd"', /HTTP/],
  ["[widgets.keyboard]\nmax_characters = 1.5", /integer/],
  ['[widgets.clock.style]\nbackground = "notacolor"', /color/],
  ["[widgets.clock]\ndisplays = [1]", /array/],
  ['[appearance]\nfont = "foo; color:red"', /font-family/],
])
  test(`invalid configuration: ${source.replaceAll("\n", " ")}`, () =>
    assert.throws(() => parseConfig(source), error));

test("unknown empty tables and unsafe object keys are rejected before pruning", () => {
  assert.throws(() => parseConfig("[capsules]"), /unknown field/);
  assert.throws(() => parseConfig("[widgets.clock.style.unknown]"), /unknown field/);
  assert.throws(() => parseConfig("__proto__.polluted = true"));
  assert.throws(() => resolveConfig({ widgets: { weather: null } }), /table/);
  assert.equal({}.polluted, undefined);
});

test("selected coordinates, literal strings, and escaped names round-trip without JSON repair", () => {
  const overrides = {
    appearance: { font: 'Font "A", monospace' },
    widgets: {
      weather: {
        location_mode: "configured",
        location: { label: "L'Haÿ-les-Roses\\Paris\nFrance", latitude: 0, longitude: 0 },
      },
    },
  };
  assert.deepEqual(parseConfig(serializeConfig(overrides)), overrides);
});

test("draft previews allow incomplete location edits, while defaults cannot be mutated", () => {
  const draft = previewConfig({ widgets: { weather: { location_mode: "configured" } } });
  assert.equal(draft.widgets.weather.location_mode, "configured");
  assert.throws(() => resolveConfig({ widgets: { weather: { location_mode: "configured" } } }));
  assert.throws(() => {
    defaultSettings.appearance.font_size = "99px";
  });
});

test("schema and reference are generated from the same field definitions used by the GUI", async () => {
  assert.deepEqual(
    JSON.parse(await readFile(new URL("../lib/schemas/config.json", import.meta.url), "utf8")),
    schema,
  );
  const paths = controls().map((field) => field.path);
  assert.ok(paths.includes("widgets.weather.location"));
  assert.ok(paths.includes("widgets.clock.style.dark.background"));
  assert.ok(paths.includes("bar.padding"));
  assert.ok(paths.includes("bar.foreground_height"));
  assert.ok(!paths.includes("bar.height"));
  assert.ok(!paths.some((path) => path.includes("custom") || path === "bar.position"));
  assert.equal(
    getPath(definition, "properties.widgets.properties.clock.properties.enabled").default,
    true,
  );
  const docs = await readFile(new URL("../docs/config-fields.md", import.meta.url), "utf8");
  for (const line of reference()
    .split("\n")
    .filter((value) => value.startsWith("| `")))
    assert.ok(docs.includes(line.split(" | ")[0].slice(2).trim()));
});

test("bar padding remains independent of background, and only local colors override the theme", async () => {
  const { namespace: variables } = await loadModule("lib/styles/core/variables.js", {
    mocks: { uebersicht: { React } },
  });
  const settings = resolveConfig({
    appearance: { theme: "auto" },
    bar: {
      background: false,
      padding: "4px 8px",
      foreground_height: "40px",
      edge_padding: "9px",
      colors: { background: "navy" },
    },
    widgets: {
      clock: { style: { foreground: "white", background: "red", dark: { background: "blue" } } },
    },
    process: { style: { focused_background: "green" } },
  });
  const css = variables.buildStyles(settings);
  assert.match(css, /--bar-inner-margin: 4px 8px/);
  assert.match(css, /--bar-foreground-height: 40px/);
  assert.match(css, /--bar-outer-margin: 9px/);
  assert.match(css, /--bar-background: navy/);
  assert.match(css, /\.rift-bar \.data-widget.time \{color: white;background-color: blue;/);
  assert.match(css, /\.process__window--focused \{background-color: green;/);
  assert.match(css, /prefers-color-scheme: light/);
  const reset = variables.buildStyles(resolveConfig({}));
  assert.doesNotMatch(reset, /background-color: blue|--bar-background: navy/);
  const base = await readFile(new URL("../lib/styles/core/base.js", import.meta.url), "utf8");
  assert.doesNotMatch(base, /no-bar-background \{\s*padding: 0/);
});
