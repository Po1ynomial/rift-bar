// Opt-in host checks. Use Übersicht's installed compiler and read sound settings.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import * as runtime from "../../lib/widgets/runtime.js";
import * as TOML from "smol-toml";
import * as themes from "../../lib/styles/themes.js";
import { loadModule, React } from "../helpers/modules.mjs";

const require = createRequire("/Applications/Übersicht.app/Contents/Resources/server.js");
const babel = require("@babel/core");
const env = require("@babel/preset-env");
const react = require("@babel/preset-react");
const rest = require("@babel/plugin-proposal-object-rest-spread");
const emotion = require("babel-plugin-emotion");
const compileOptions = {
  babelrc: false,
  configFile: false,
  presets: [
    [env, { targets: "last 4 Safari versions", modules: "commonjs" }],
    [react, { pragma: "html" }],
  ],
  plugins: [rest, emotion],
};

test("Übersicht-compiled configuration parses, validates, resets, and serializes sparse TOML", async () => {
  const filename = fileURLToPath(new URL("../../lib/config.js", import.meta.url));
  const { code } = babel.transformSync(await readFile(filename, "utf8"), {
    ...compileOptions,
    filename,
  });
  const exports = {};
  const context = createContext({
    exports,
    URL,
    require: (specifier) => {
      if (specifier === "smol-toml") return TOML;
      assert.equal(specifier, "./styles/themes.js");
      return themes;
    },
  });
  runInContext(code, context, { filename });
  const config = exports.parseConfig(
    '[appearance]\nfont_size = "13px"\n[widgets.weather]\nlocation_mode = "configured"\n[widgets.weather.location]\nlatitude = 0\nlongitude = 0\n',
  );
  assert.equal(exports.resolveConfig(config).appearance.font_size, "13px");
  const reset = exports.editOverride(config, "appearance.font_size", undefined);
  assert.equal(exports.resolveConfig(reset).appearance.font_size, "11px");
  assert.doesNotMatch(exports.serializeConfig(reset), /appearance/);
  assert.throws(() => exports.parseConfig('[bar]\nposition = "bottom"'), /unknown field/);
});

test("the complete widget graph bundles with Übersicht's installed Browserify and Babel", async () => {
  const browserify = require("browserify");
  const filename = fileURLToPath(new URL("../../index.jsx", import.meta.url));
  const bundle = browserify(filename, { detectGlobals: false });
  bundle.external("uebersicht");
  bundle.transform(require("babelify"), compileOptions);
  const output = await new Promise((resolve, reject) =>
    bundle.bundle((error, data) => (error ? reject(error) : resolve(data))),
  );
  assert.ok(output.length > 0);
});

async function compiledWeather() {
  const filename = fileURLToPath(new URL("../../lib/widgets/weather.js", import.meta.url));
  // Match bundleWidget's options in Übersicht's server.js, not public/.babelrc.
  const { code } = babel.transformSync(await readFile(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    presets: [
      [env, { targets: "last 4 Safari versions", modules: "commonjs" }],
      [react, { pragma: "html" }],
    ],
    plugins: [rest, emotion],
  });
  const exports = {};
  const context = createContext({
    exports,
    console,
    URL,
    URLSearchParams,
    DOMException,
    AbortController,
    setTimeout,
    clearTimeout,
    require: (specifier) => {
      assert.equal(specifier, "./runtime.js");
      return runtime;
    },
    navigator: {
      geolocation: {
        getCurrentPosition: (resolve) => resolve({ coords: { latitude: 48.85, longitude: 2.35 } }),
      },
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 12, weather_code: 0, is_day: 1, time: 1700000000 },
      }),
    }),
  });
  runInContext(code, context, { filename });
  return { weather: exports, context };
}

test("Übersicht-compiled automatic weather resolves an omitted geolocation argument", async () => {
  const { weather } = await compiledWeather();
  const data = await weather.loadWeather({ location_mode: "auto", unit: "C" });
  assert.equal(data.latitude, 48.85);
  assert.equal(data.longitude, 2.35);
  assert.equal(data.temperature, 12);
});

test("Übersicht-compiled getPosition resolves its default inside the function body", async () => {
  const { weather } = await compiledWeather();
  const position = await weather.getPosition();
  assert.equal(position.latitude, 48.85);
});

test("Übersicht-compiled configured weather never reads navigator", async () => {
  const { weather, context } = await compiledWeather();
  Object.defineProperty(context, "navigator", {
    get: () => assert.fail("Configured mode must not access geolocation"),
  });
  const data = await weather.loadWeather({
    location_mode: "configured",
    unit: "C",
    location: { label: "Selected", latitude: 0, longitude: 0 },
  });
  assert.equal(data.latitude, 0);
  assert.equal(data.location, "Selected");
});

test("the real read-only AppleScript collector produces a valid sound snapshot", async () => {
  let raw;
  const { namespace } = await loadModule("lib/widgets/system.js", {
    mocks: {
      uebersicht: {
        React,
        run: async (command) => {
          assert.match(command, /^osascript /);
          assert.match(command, /get volume settings/);
          assert.doesNotMatch(command, /set volume (?:output|input)/);
          const result = spawnSync("/bin/sh", ["-c", command], {
            encoding: "utf8",
            timeout: 10000,
          });
          assert.equal(result.status, 0, result.error?.message || result.stderr);
          raw = result.stdout;
          return raw;
        },
      },
    },
  });
  const data = await namespace.sound.load({ config: { refresh_ms: 20000 }, force: true });
  assert.equal(
    namespace.sound.validate(data),
    true,
    `Rejected real sound output: ${JSON.stringify(raw)}`,
  );
  assert.match(raw.trim(), /^\d+,(?:true|false)$/);
});
