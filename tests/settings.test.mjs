import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  symlink,
  readlink,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadModule, React } from "./helpers/modules.mjs";
import { parseConfig } from "../lib/config.js";
const execute = promisify(execFile);
const flush = () => new Promise((resolve) => setImmediate(resolve));
function storage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}
async function preferences(run, localStorage = storage()) {
  const events = new Map();
  const { namespace } = await loadModule("lib/settings.js", {
    globals: {
      window: {
        localStorage,
        addEventListener: (name, fn) => events.set(name, fn),
        removeEventListener: (name) => events.delete(name),
      },
    },
    mocks: { uebersicht: { React, run } },
  });
  return { settings: namespace, events, localStorage };
}
async function sandbox(fn, xdg = "") {
  const home = await mkdtemp(join(tmpdir(), "rift-config-"));
  const path = join(xdg || join(home, ".config"), "rift-bar", "config.toml");
  const commands = [];
  const run = async (command) => {
    commands.push(command);
    return (
      await execute(
        "/bin/sh",
        ["-c", command.replaceAll("simple-bar/lib/scripts/", "lib/scripts/")],
        {
          env: {
            ...process.env,
            HOME: home,
            XDG_CONFIG_HOME: xdg,
            RIFT_BAR_NODE: process.execPath,
          },
        },
      )
    ).stdout;
  };
  try {
    await fn({ home, path, run, commands });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test("missing XDG config uses defaults without reading legacy preferences or creating files", async () =>
  sandbox(async ({ home, run, commands }) => {
    await writeFile(join(home, ".simplebarrc"), "not JSON");
    const { settings } = await preferences(run);
    const [first, second] = await Promise.all([settings.init(), settings.init()]);
    assert.equal(first, second);
    assert.equal(first.appearance.font_size, "11px");
    assert.equal(settings.getState().revision, "missing");
    assert.equal(commands.length, 1);
    assert.deepEqual(await readdir(home), [".simplebarrc"]);
    assert.equal(JSON.stringify(settings.getState().overrides), "{}");
  }));

test("XDG_CONFIG_HOME is honored and first explicit save creates only sparse TOML", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rift-xdg-"));
  try {
    await sandbox(async ({ path, run }) => {
      const { settings } = await preferences(run);
      await settings.init();
      await settings.set({ appearance: { theme: "dark" } });
      assert.deepEqual(parseConfig(await readFile(path, "utf8")), {
        appearance: { theme: "dark" },
      });
      assert.equal(settings.get().appearance.font_size, "11px");
      assert.ok(settings.getState().path.startsWith(directory));
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("startup does not rewrite an existing file, including comments and explicit defaults", async () =>
  sandbox(async ({ path, run, commands }) => {
    await mkdir(join(path, ".."), { recursive: true });
    const source = '# personal\n[appearance]\nfont_size = "11px"\n';
    await writeFile(path, source);
    const { settings } = await preferences(run);
    await settings.init();
    assert.equal(await readFile(path, "utf8"), source);
    assert.equal(commands.length, 1);
    await settings.set({ ...settings.getState().overrides, bar: { floating: true } });
    const saved = await readFile(path, "utf8");
    assert.doesNotMatch(saved, /personal/);
    assert.deepEqual(parseConfig(saved), {
      appearance: { font_size: "11px" },
      bar: { floating: true },
    });
  }));

test("stale editing sessions and external file edits cannot silently overwrite configuration", async () =>
  sandbox(async ({ path, run }) => {
    const { settings } = await preferences(run);
    await settings.init();
    const session = settings.getState();
    await settings.set({ bar: { floating: true } }, session);
    await assert.rejects(
      settings.set({ appearance: { theme: "dark" } }, session),
      /changed on disk/,
    );
    const before = settings.getState();
    await writeFile(path, '[appearance]\ntheme = "light"\n');
    await assert.rejects(settings.set({ bar: { background: false } }, before), /changed on disk/);
    assert.equal(settings.getState(), before);
    assert.deepEqual(parseConfig(await readFile(path, "utf8")), { appearance: { theme: "light" } });
  }));

test("concurrent GUI saves serialize and only one stale-revision writer succeeds", async () =>
  sandbox(async ({ path, run }) => {
    const first = (await preferences(run)).settings;
    const second = (await preferences(run)).settings;
    await Promise.all([first.init(), second.init()]);
    const results = await Promise.allSettled([
      first.set({ bar: { floating: true } }),
      second.set({ bar: { background: false } }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const value = parseConfig(await readFile(path, "utf8"));
    assert.equal(Object.keys(value.bar).length, 1);
    assert.deepEqual(await readdir(join(path, "..")), ["config.toml"]);
  }));

test("invalid loads retain last valid settings, publish an error, block saves, and recover", async () =>
  sandbox(async ({ path, run }) => {
    const { settings } = await preferences(run);
    await settings.init();
    await settings.set({ appearance: { font_size: "17px" } });
    const valid = settings.get();
    await writeFile(path, '[appearance]\nfont_size = "bad-size"\n');
    await assert.rejects(settings.reload(), /appearance.font_size.*line 2/);
    assert.equal(settings.get(), valid);
    assert.match(settings.getState().error.message, /font_size/);
    await assert.rejects(settings.set({}), /font_size/);
    assert.match(await readFile(path, "utf8"), /bad-size/);
    await writeFile(path, '[appearance]\nfont_size = "19px"\n');
    await settings.reload();
    assert.equal(settings.get().appearance.font_size, "19px");
    assert.equal(settings.getState().error, undefined);
  }));

test("malformed startup never writes or substitutes defaults as a successful load", async () =>
  sandbox(async ({ path, run, commands }) => {
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, "[broken");
    const { settings } = await preferences(run);
    await assert.rejects(settings.init());
    assert.equal(settings.isInitialized(), false);
    assert.equal(commands.length, 1);
    assert.equal(await readFile(path, "utf8"), "[broken");
  }));

test("symlinks are followed, and dangling links, directories, and relative XDG paths fail safely", async () =>
  sandbox(async ({ home, path, run }) => {
    await mkdir(join(path, ".."), { recursive: true });
    const target = join(home, "preferences.toml");
    await writeFile(target, "");
    await symlink(target, path);
    const { settings } = await preferences(run);
    await settings.init();
    await settings.set({ appearance: { theme: "dark" } });
    assert.equal(await readlink(path), target);
    assert.match(await readFile(target, "utf8"), /dark/);
    await rm(target);
    await assert.rejects(settings.init(), /symlink target/);
    await rm(path);
    await mkdir(path);
    await assert.rejects(settings.init(), /directory/);
    await assert.rejects(
      execute("/bin/sh", ["lib/scripts/config-file.sh", "read"], {
        env: {
          ...process.env,
          HOME: home,
          XDG_CONFIG_HOME: "relative",
          RIFT_BAR_NODE: process.execPath,
        },
      }),
      /must be absolute/,
    );
  }));

test("write failures leave memory and browser notification state unchanged", async () => {
  let writes = false;
  const { settings, localStorage } = await preferences(async () => {
    if (writes) throw new Error("Disk full");
    return JSON.stringify({ path: "/config.toml", revision: "missing", text: "" });
  });
  await settings.init();
  const before = settings.getState();
  writes = true;
  await assert.rejects(settings.set({ bar: { floating: true } }), /Disk full/);
  assert.equal(settings.getState(), before);
  assert.equal(localStorage.getItem("rift-bar-config-reload"), null);
});

test("a save/reload notification makes another display read the file, not browser-cached settings", async () =>
  sandbox(async ({ run }) => {
    const shared = storage();
    const first = await preferences(run, shared);
    const second = await preferences(run, shared);
    await Promise.all([first.settings.init(), second.settings.init()]);
    const updates = [];
    const stop = second.settings.subscribe((state) => updates.push(state));
    await first.settings.set({ widgets: { weather: { enabled: true } } });
    await second.events.get("storage")({ key: "rift-bar-config-reload" });
    await flush();
    assert.equal(second.settings.get().widgets.weather.enabled, true);
    assert.equal(updates.length, 1);
    stop();
    assert.equal(second.events.size, 0);
  }));

test("browser storage is optional; snapshot commands can request file reloads instead", async () => {
  const { settings } = await preferences(
    async () => JSON.stringify({ path: "/config.toml", revision: "missing", text: "" }),
    {
      getItem: () => {
        throw new Error("No storage");
      },
      setItem: () => {
        throw new Error("No storage");
      },
    },
  );
  await settings.init();
  assert.equal(settings.reloadRequested(), true);
  assert.equal(settings.get().appearance.theme, "auto");
});

test("successful saves require an acknowledgement and never accept a failed command's output", async () => {
  const { settings } = await preferences(async (command) =>
    command.includes("config-file.sh read")
      ? JSON.stringify({ path: "/config.toml", revision: "missing", text: "" })
      : "",
  );
  await settings.init();
  const before = settings.getState();
  await assert.rejects(settings.set({ bar: { floating: true } }), /not acknowledged/);
  assert.equal(settings.getState(), before);
});

test("unrelated configuration edits retain collector configuration identities", async () =>
  sandbox(async ({ run }) => {
    const { settings } = await preferences(run);
    await settings.init();
    await settings.set({ widgets: { clock: { format: "12h" } } });
    const clock = settings.get().widgets.clock;
    const changed = { ...settings.getState().overrides, bar: { floating: true } };
    await settings.set(changed);
    assert.equal(settings.get().widgets.clock, clock);
  }));

test("shell persistence preserves Unicode, quotes, backslashes, and newlines in selected labels", async () =>
  sandbox(async ({ run, path }) => {
    const { settings } = await preferences(run);
    await settings.init();
    const location = { label: "L'Haÿ-les-Roses\\Paris\nFrance", latitude: 0, longitude: 0 };
    await settings.set({ widgets: { weather: { location_mode: "configured", location } } });
    assert.deepEqual(parseConfig(await readFile(path, "utf8")).widgets.weather.location, location);
  }));
