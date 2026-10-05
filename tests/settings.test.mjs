import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile, readdir, mkdir, symlink, readlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

async function loadSettings(config = {}, run) {
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
    ["uebersicht", { run: async (command) => { commands.push(command); return run ? run(command) : ""; } }],
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
  assert.ok(commands.some(command => command.includes("save-settings.sh")));
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
    const defaults = settings.defaultSettings[section];
    const properties = schema.properties[section].properties;
    assert.deepEqual(Object.keys(defaults).sort(), Object.keys(properties).sort());
    for (const [key, value] of Object.entries(defaults)) {
      assert.ok(settings.data[key], `Missing settings control: ${section}.${key}`);
      assert.equal(properties[key].type, typeof value, `${section}.${key}`);
      if (properties[key].enum) assert.ok(properties[key].enum.includes(value), `${section}.${key}`);
    }
  }
});

test("failed persistence rejects without changing browser storage", async () => {
  const { settings, storage } = await loadSettings(legacy, async () => { throw new Error("Disk is full"); });
  const before = storage.get("simple-bar-settings");
  await assert.rejects(settings.set({ global: { fontSize: "33px" } }), /Disk is full/);
  assert.equal(storage.get("simple-bar-settings"), before);
});

test("migration removes only explicitly retired options and preserves deferred fields", async () => {
  const config = {
    global: { shell: "bash", futureOption: "keep" },
    process: { futureOption: 42 },
    spacesDisplay: { futureOption: true },
    batteryWidgetOptions: { disableCaffeinateInvertedBackground: true, futureOption: "keep" },
    futureSection: { nested: "keep" },
    customStyles: { styles: "/* untouched */" },
  };
  const { settings } = await loadSettings(config);
  const current = settings.get();
  assert.ok(!("shell" in current.global));
  assert.ok(!settings.data.shell);
  assert.equal(current.global.futureOption, "keep");
  assert.equal(current.process.futureOption, 42);
  assert.equal(current.spacesDisplay.futureOption, true);
  assert.equal(current.batteryWidgetOptions.futureOption, "keep");
  assert.equal(current.batteryWidgetOptions.disableCaffeinateInvertedBackground, true);
  assert.equal(current.futureSection.nested, "keep");
  assert.equal(current.customStyles.styles, "/* untouched */");
});

async function withHome(callback) {
  const home = await mkdtemp(join(tmpdir(), "rift-bar-settings-"));
  try {
    const run = async (command) => {
      const result = spawnSync("/bin/sh", ["-c", command], {
        encoding: "utf8", env: { ...process.env, HOME: home },
      });
      if (result.status !== 0) throw new Error(result.stderr || `Command exited ${result.status}`);
      return result.stdout;
    };
    await callback(home, run);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test("atomic saves round-trip JSON and unchanged startup does not rewrite the file", async () => {
  await withHome(async (home, run) => {
    // The widget symlink is the only installation dependency in these commands.
    const originalRun = run;
    run = (command) => originalRun(command.replace("simple-bar/lib/scripts/", "lib/scripts/"));
    const { settings } = await loadSettings({}, run);
    const title = "日本語 'quoted'\nnext line \\n \\\\ trailing\\";
    await settings.set({ userWidgets: { userWidgetsList: { 0: { output: title } } } });
    const saved = JSON.parse(await readFile(join(home, ".simplebarrc"), "utf8"));
    assert.equal(saved.userWidgets.userWidgetsList[0].output, title);
    assert.deepEqual(await readdir(home), [".simplebarrc"]);
    await writeFile(join(home, ".simplebarrc"), JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
    const writes = [];
    const fresh = await loadSettings({}, async (command) => {
      if (command.includes("save-settings.sh")) writes.push(command);
      return run(command);
    });
    const [first, second] = await Promise.all([fresh.settings.init(), fresh.settings.init()]);
    assert.equal(first.global.fontSize, "11px");
    assert.equal(second.global.fontSize, "11px");
    assert.equal(writes.length, 0);
    assert.equal(fresh.settings.get().userWidgets.userWidgetsList[0].output, title);
  });
});

test("missing preferences use defaults without writing a new file", async () => {
  await withHome(async (home, run) => {
    const { settings } = await loadSettings({}, run);
    const current = await settings.init();
    assert.equal(current.global.fontSize, "11px");
    assert.deepEqual(await readdir(home), []);
  });
});

test("malformed preferences fail without overwriting disk or browser storage", async () => {
  for (const text of ["not JSON", "null", "[]", '{"global":null}', '{"global":{"fontSize":24}}', '{"global":{"theme":"invalid"}}']) {
    await withHome(async (home, run) => {
      const target = join(home, ".simplebarrc");
      await writeFile(target, text);
      const { settings, storage } = await loadSettings(legacy, run);
      const before = storage.get("simple-bar-settings");
      await assert.rejects(settings.init());
      assert.equal(await readFile(target, "utf8"), text);
      assert.equal(storage.get("simple-bar-settings"), before);
    });
  }
});

test("atomic writer preserves symlinks and cleans up after a failed replacement", async () => {
  await withHome(async (home, run) => {
    run = ((original) => (command) => original(command.replace("simple-bar/lib/scripts/", "lib/scripts/")))(run);
    await writeFile(join(home, "dotfile"), "{}");
    await symlink("dotfile", join(home, ".simplebarrc"));
    const { settings } = await loadSettings({}, run);
    await settings.set({ global: { fontSize: "19px" } });
    assert.equal(await readlink(join(home, ".simplebarrc")), "dotfile");
    assert.equal(JSON.parse(await readFile(join(home, "dotfile"), "utf8")).global.fontSize, "19px");
    await rm(join(home, ".simplebarrc"));
    await mkdir(join(home, ".simplebarrc"));
    await assert.rejects(settings.set({}));
    assert.deepEqual((await readdir(home)).sort(), [".simplebarrc", "dotfile"]);
  });
});

test("a failed atomic replacement leaves the old file and no temporary files", async () => {
  await withHome(async (home, run) => {
    const bin = join(home, "bin");
    await mkdir(bin);
    await writeFile(join(bin, "mv"), "#!/bin/sh\nexit 1\n", { mode: 0o700 });
    await writeFile(join(home, ".simplebarrc"), "original");
    const originalRun = run;
    run = (command) => originalRun(`export PATH='${bin}':"$PATH"; ${command.replace("simple-bar/lib/scripts/", "lib/scripts/")}`);
    const { settings } = await loadSettings({}, run);
    await assert.rejects(settings.set({}));
    assert.equal(await readFile(join(home, ".simplebarrc"), "utf8"), "original");
    assert.deepEqual((await readdir(home)).sort(), [".simplebarrc", "bin"]);
  });
});
