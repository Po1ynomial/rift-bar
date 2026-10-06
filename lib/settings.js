import * as Uebersicht from "uebersicht";
import {
  defaultSettings,
  freeze,
  isTable,
  parseConfig,
  resolveConfig,
  serializeConfig,
} from "./config.js";
import { paletteStamp, setPaletteTexts } from "./palette.js";

export { defaultSettings } from "./config.js";
export { Component, styles, Wrapper } from "./components/settings/settings.jsx";

const RELOAD_KEY = "rift-bar-config-reload";
const quote = (value) => `'${String(value).replace(/'/g, `'"'"'`)}'`;
const listeners = new Set();
let state = Object.freeze({
  settings: defaultSettings,
  overrides: freeze({}),
  path: undefined,
  revision: undefined,
  error: undefined,
  paletteStamp: paletteStamp(),
});
let initialized = false;
let initialization;
let observedToken;

function token() {
  try {
    return window.localStorage.getItem(RELOAD_KEY) ?? null;
  } catch {
    return undefined;
  }
}
function reuse(previous, next) {
  if (Object.is(previous, next)) return previous;
  if (!isTable(previous) || !isTable(next))
    return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
  const result = Object.fromEntries(
    Object.entries(next).map(([key, value]) => [key, reuse(previous[key], value)]),
  );
  return Object.keys(previous).length === Object.keys(result).length &&
    Object.keys(result).every((key) => Object.is(previous[key], result[key]))
    ? previous
    : freeze(result);
}
function publish(next) {
  if (next.settings) next.settings = reuse(state.settings, next.settings);
  state = Object.freeze({ ...state, ...next });
  for (const listener of listeners) listener(state);
}
export const get = () => state.settings;
export const getState = () => state;
export const isInitialized = () => initialized;
export const reloadRequested = () => token() === undefined || token() !== observedToken;

async function read() {
  const result = JSON.parse(
    await Uebersicht.run("/bin/sh rift-bar/lib/scripts/config-file.sh read"),
  );
  if (
    typeof result.path !== "string" ||
    typeof result.revision !== "string" ||
    typeof result.text !== "string"
  )
    throw new TypeError("Invalid configuration file response");
  let overrides;
  try {
    overrides = parseConfig(result.text);
  } catch (error) {
    error.configPath = result.path;
    error.message = `${result.path}: ${error.message}`;
    throw error;
  }
  const palette = setPaletteTexts(result.palettes);
  return {
    path: result.path,
    revision: result.revision,
    overrides: freeze(overrides),
    settings: freeze(resolveConfig(overrides)),
    error: undefined,
    paletteStamp: palette.stamp,
  };
}
export function init() {
  if (!initialization) {
    const requestedToken = token();
    initialization = read()
      .then((next) => {
        initialized = true;
        observedToken = requestedToken;
        publish(next);
        return next.settings;
      })
      .catch((error) => {
        publish({ error, path: error.configPath ?? state.path });
        throw error;
      })
      .finally(() => {
        initialization = undefined;
      });
  }
  return initialization;
}

// The caller supplies the revision captured when its editing session began.
// This protects against another display's GUI save as well as external edits.
export async function set(overrides, expected = state) {
  if (state.error) throw state.error;
  if (expected.revision === undefined) throw new Error("Load the configuration before saving");
  const source = serializeConfig(overrides);
  const acknowledgement = await Uebersicht.run(
    `printf '%s' ${quote(source)} | /bin/sh rift-bar/lib/scripts/config-file.sh save ${quote(expected.path)} ${quote(expected.revision)}`,
  );
  if (typeof acknowledgement !== "string" || acknowledgement.trim() !== "saved")
    throw new Error("Configuration save was not acknowledged; reload before retrying");
  // Read the actual bytes/revision rather than maintaining a second authority.
  if (initialization) await initialization;
  await init();
  broadcast();
}
function broadcast() {
  try {
    const nextToken = `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(RELOAD_KEY, nextToken);
    observedToken = nextToken;
  } catch {
    // Without storage, snapshot commands reload directly from the file.
  }
}
export async function reload() {
  await init();
  broadcast();
}

async function onStorage(event) {
  if (event.key !== RELOAD_KEY || !reloadRequested()) return;
  try {
    await init();
  } catch {
    /* Subscribers display the error and retain the last valid settings. */
  }
}
export function subscribe(listener) {
  if (!listeners.size) window.addEventListener?.("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener?.("storage", onStorage);
  };
}
