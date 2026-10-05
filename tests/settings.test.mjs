import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

async function loadSettings(config = {}) {
  const storage = new Map([["simple-bar-settings", JSON.stringify(config)]]);
  const commands = [];
  const context = createContext({
    window: { localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    } },
  });
  const settings = new SourceTextModule(
    await readFile(new URL("../lib/settings.js", import.meta.url), "utf8"),
    { context },
  );
  const utils = new SourceTextModule(
    await readFile(new URL("../lib/utils.js", import.meta.url), "utf8"),
    { context },
  );
  const mocks = new Map([
    ["uebersicht", { run: async (command) => { commands.push(command); return ""; } }],
    ["./styles/themes", { collection: {} }],
    ["./components/settings/user-widgets-creator.jsx", { default: () => {} }],
    ["./components/settings/settings.jsx", { Component: () => {}, Wrapper: () => {}, styles: "" }],
  ]);
  const modules = new Map();
  await settings.link(async (specifier) => {
    if (specifier === "./utils") return utils;
    if (specifier === "./settings") return settings;
    if (!modules.has(specifier)) {
      const exports = mocks.get(specifier);
      assert.ok(exports, `Unexpected settings dependency: ${specifier}`);
      modules.set(specifier, new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context }));
    }
    return modules.get(specifier);
  });
  await settings.evaluate();
  return { settings: settings.namespace, utils: utils.namespace, storage, commands };
}

const legacy = {
  global: { fontSize: "14px", riftPath: "/custom/rift-cli", windowManager: "rift", yabaiPath: "old", aerospacePath: "old", enableServer: true, serverSocketPort: 7777 },
  process: { centered: true, displayStackIndex: true, displaySkhdMode: true },
  spacesDisplay: { hideEmptySpaces: true, customAeroSpaceDisplayIndexes: { 1: 2 }, hideCreateSpaceButton: true },
  userWidgets: { userWidgetsList: { 0: { active: true, output: "printf custom", backgroundColor: "green" } } },
};

test("legacy settings retain user preferences but drop removed backend and server options", async () => {
  const { settings } = await loadSettings(legacy);
  const current = settings.get();
  assert.equal(current.global.fontSize, "14px");
  assert.equal(current.global.riftPath, "/custom/rift-cli");
  assert.equal(current.process.centered, true);
  assert.equal(current.spacesDisplay.hideEmptySpaces, true);
  assert.equal(current.userWidgets.userWidgetsList[0].output, "printf custom");
  for (const key of ["windowManager", "yabaiPath", "aerospacePath", "enableServer", "serverSocketPort"]) assert.ok(!(key in current.global), key);
  assert.ok(!("displayStackIndex" in current.process));
  assert.ok(!("displaySkhdMode" in current.process));
  assert.ok(!("customAeroSpaceDisplayIndexes" in current.spacesDisplay));
  assert.ok(!("hideCreateSpaceButton" in current.spacesDisplay));
});

test("loading saved preferences does not mutate defaults", async () => {
  const { settings } = await loadSettings(legacy);
  settings.get();
  assert.equal(settings.defaultSettings.global.fontSize, "11px");
  assert.equal(settings.defaultSettings.process.centered, false);
  assert.deepEqual(Object.keys(settings.defaultSettings.userWidgets.userWidgetsList), []);
});

test("saved settings use the local Rift schema and omit obsolete options", async () => {
  const { settings, storage, commands } = await loadSettings();
  await settings.set(legacy);
  const saved = JSON.parse(storage.get("simple-bar-settings"));
  assert.equal(saved.$schema, "http://127.0.0.1:41416/simple-bar/lib/schemas/config.json");
  assert.equal(saved.global.fontSize, "14px");
  assert.ok(!("enableServer" in saved.global));
  assert.ok(!("windowManager" in saved.global));
  assert.ok(!("$schema" in settings.get()));
  assert.ok(commands.some(command => command.includes("~/.simplebarrc")));
});

test("Rift window filtering preserves app and title exclusions", async () => {
  const { utils } = await loadSettings();
  const window = { "app-name": "kitty", "window-title": "Preferences" };
  assert.equal(utils.filterApps(window, [], [], false), true);
  assert.equal(utils.filterApps(window, ["kitty"], [], false), false);
  assert.equal(utils.filterApps(window, [], ["Preferences"], false), false);
  assert.equal(utils.filterApps(window, "^kit", "", true), false);
  assert.equal(utils.filterApps(window, "", "^Pref", true), false);
  assert.equal(utils.filterApps({ ...window, "window-title": "" }, [], ["Preferences"], false), true);
});

test("retained workspace and global defaults have settings controls and schema entries", async () => {
  const { settings } = await loadSettings();
  const schema = JSON.parse(await readFile(new URL("../lib/schemas/config.json", import.meta.url), "utf8"));
  for (const section of ["global", "process", "spacesDisplay"]) {
    for (const key of Object.keys(settings.defaultSettings[section])) {
      assert.ok(settings.data[key], `Missing settings control: ${section}.${key}`);
      assert.ok(schema.properties[section].properties[key], `Missing schema setting: ${section}.${key}`);
    }
  }
});
