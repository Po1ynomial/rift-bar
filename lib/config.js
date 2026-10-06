import { parse, stringify } from "smol-toml";
import { collection as themes } from "./styles/themes.js";

const field = (label, type, value, extra = {}) => ({ label, type, default: value, ...extra });
const boolean = (label, value = true) => field(label, "boolean", value);
const text = (label, value = "") => field(label, "string", value);
const choice = (label, value, options) => field(label, "string", value, { enum: options });
const number = (label, value, min = 0, max = Infinity) =>
  field(label, "number", value, { min, max });
const strings = (label) => field(label, "array", [], { items: "string" });
const length = (label, value, positive = false) =>
  field(label, "string", value, { css: "length", positive });
const color = (label) => field(label, "string", undefined, { css: "color" });
const table = (label, properties) => ({ label, type: "object", properties });
const colorFields = () => ({ foreground: color("Foreground"), background: color("Background") });
const style = (focused = false) => {
  const colors = colorFields();
  if (focused) {
    colors.focused_foreground = color("Focused foreground");
    colors.focused_background = color("Focused background");
  }
  return table("Colors", {
    ...colors,
    dark: table("Dark appearance colors", { ...colors }),
    light: table("Light appearance colors", { ...colors }),
  });
};
const displays = () => strings("Show on displays, UUIDs; empty means all");
const widget = (label, enabled, refresh, extra = {}, showIcon = true) =>
  table(label, {
    enabled: boolean("Enabled", enabled),
    displays: displays(),
    ...(showIcon ? { show_icon: boolean("Show icon") } : {}),
    refresh_ms: number("Refresh interval, milliseconds", refresh, 250, 2147483647),
    ...extra,
    style: style(),
  });

// This definition is the contract for defaults, validation, GUI controls, and schema.
export const definition = table("Configuration", {
  appearance: table("Appearance", {
    theme: choice("Appearance", "auto", ["auto", "dark", "light"]),
    dark_theme: choice(
      "Dark theme",
      "NightShiftDark",
      Object.keys(themes).filter((key) => themes[key].kind === "dark"),
    ),
    light_theme: choice(
      "Light theme",
      "NightShiftLight",
      Object.keys(themes).filter((key) => themes[key].kind === "light"),
    ),
    font: text("Font", "JetBrains Mono, Monaco, Menlo, monospace"),
    font_size: length("Font size", "11px", true),
    animations: boolean("Persistent animations"),
    text_scroll_speed: number("Text scrolling speed", 4, 0.1),
  }),
  bar: table("Bar", {
    floating: boolean("Floating bar", false),
    edge_padding: length("Distance from screen edges", "5px"),
    background: boolean("Bar background"),
    foreground_height: { ...length("Foreground group height", undefined, true), percent: false },
    padding: field("Padding around button groups", "string", undefined, { css: "padding" }),
    radius: length("Corner radius", undefined),
    shadow: boolean("Bar shadow"),
    colors: table("Bar colors", colorFields()),
  }),
  workspaces: table("Workspaces", {
    displays: displays(),
    all_displays: boolean("Include other displays' workspaces", false),
    show_empty: boolean("Show empty workspaces"),
    show_app_icons: boolean("Show application icons"),
    deduplicate_apps: boolean("One icon per application", false),
    style: style(true),
  }),
  process: table("Windows", {
    mode: choice("Windows to show", "all", ["hidden", "focused", "all"]),
    displays: displays(),
    centered: boolean("Center window selectors", false),
    show_titles: boolean("Show window titles"),
    icons_only: boolean("Icons only", false),
    expand_all: boolean("Expand every window label", false),
    style: style(true),
  }),
  windows: table("Window filters", {
    exclude_apps: strings("Excluded application names"),
    exclude_titles: strings("Excluded window titles"),
  }),
  widgets: table("Widgets", {
    clock: widget("Clock", true, 1000, {
      format: choice("Clock format", "24h", ["12h", "24h"]),
      show_seconds: boolean("Show seconds", false),
      day_progress: boolean("Day progress"),
    }),
    date: widget("Date", true, 30000, {
      format: choice("Date format", "short", ["short", "long"]),
      locale: text("Locale", "en-GB"),
      calendar_app: text("Calendar application"),
    }),
    battery: widget("Battery", true, 10000, {
      toggle_caffeinate: boolean("Toggle caffeinate on click"),
      caffeinate_scope: choice("Prevent sleeping", "system", ["system", "display", "both"]),
      caffeinate_timeout_seconds: {
        ...number("Caffeinate timeout, seconds; zero means none", 0, 0, 2147483647),
        integer: true,
      },
      highlight_caffeinate: boolean("Highlight caffeinate"),
    }),
    wifi: widget("Wi-Fi", true, 20000, {
      device: text("Network device", "en0"),
      hide_when_disabled: boolean("Hide when disconnected", false),
      show_name: boolean("Show network name"),
      toggle_on_click: boolean("Toggle Wi-Fi on click", false),
    }),
    volume: widget("Output volume", true, 20000),
    microphone: widget("Microphone", false, 20000),
    keyboard: widget("Keyboard", false, 20000, {
      max_characters: { ...number("Maximum characters; zero means unlimited", 0), integer: true },
    }),
    cpu: widget("CPU", false, 2000, {
      display: choice("Display", "number", ["number", "graph"]),
      hide_below_percent: number("Hide below percent", 0, 0, 100),
      monitor_app: choice("Monitor application", "activity_monitor", [
        "activity_monitor",
        "top",
        "none",
      ]),
    }),
    memory: widget("Memory", false, 4000, {
      hide_below_percent: number("Hide below percent", 0, 0, 100),
      monitor_app: choice("Monitor application", "activity_monitor", [
        "activity_monitor",
        "top",
        "none",
      ]),
    }),
    network_stats: widget("Network statistics", false, 2000, {
      display: choice("Display", "number", ["number", "graph"]),
      hide_below_kib_per_second: number("Hide below KiB/s", 0),
    }),
    notifications: widget(
      "Dock notification badges",
      false,
      10000,
      { exclude_apps: strings("Excluded application names") },
      false,
    ),
    weather: widget("Weather", false, 1800000, {
      location_mode: choice("Location mode", "auto", ["auto", "configured"]),
      unit: choice("Temperature unit", "C", ["C", "F"]),
      show_location: boolean("Show location"),
      show_gradient: boolean("Show sunrise/sunset gradient"),
      location: table("Selected location", {
        label: text("Location label"),
        latitude: number("Latitude", undefined, -90, 90),
        longitude: number("Longitude", undefined, -180, 180),
      }),
    }),
    github: widget("GitHub", false, 600000, {
      hide_when_empty: boolean("Hide without notifications", false),
      url: text("Notifications URL", "https://github.com/notifications"),
      cli_path: text("GitHub CLI path", "/opt/homebrew/bin/gh"),
    }),
    zoom: widget(
      "Zoom",
      false,
      5000,
      { show_microphone: boolean("Show microphone"), show_video: boolean("Show video") },
      false,
    ),
  }),
  rift: table("Rift", { cli_path: text("Rift CLI path", "/opt/homebrew/bin/rift-cli") }),
  interaction: table("Interaction", {
    terminal: choice("Terminal for top", "terminal", ["terminal", "iterm2"]),
    notifications: choice("Action feedback", "system", ["system", "bar", "off"]),
    click_effect: boolean("Click effect"),
  }),
});

export const isTable = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.prototype.toString.call(value) === "[object Object]";
const copy = (value) => JSON.parse(JSON.stringify(value));
export function defaults(node = definition) {
  if (node.type !== "object") return node.default === undefined ? undefined : copy(node.default);
  return Object.fromEntries(
    Object.entries(node.properties).flatMap(([key, child]) => {
      const value = defaults(child);
      return value === undefined ? [] : [[key, value]];
    }),
  );
}
export function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export const defaultSettings = freeze(defaults());

export class ConfigError extends Error {
  constructor(path, message) {
    super(`${path || "Configuration"}: ${message}`);
    this.name = "ConfigError";
    this.path = path;
  }
}
const cssLength = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in|%)?$/;
const namedColors = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow yellowgreen currentcolor".split(
    " ",
  ),
);
function validCss(value, node) {
  if (node.css === "color") {
    if (/[;{}]/.test(value) || /\b(?:var|env)\s*\(/i.test(value)) return false;
    if (typeof CSS !== "undefined" && CSS.supports) return CSS.supports("color", value);
    if (
      namedColors.has(value.toLowerCase()) ||
      /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
    )
      return true;
    const match = value.match(/^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(([^()]*)\)$/i);
    if (!match) return false;
    const components = match[1].trim().split(/[\s,/]+/);
    return (
      [3, 4].includes(components.length) &&
      components.every((component) =>
        /^(?:none|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:%|deg|grad|rad|turn)?)$/i.test(
          component,
        ),
      )
    );
  }
  const values = node.css === "padding" ? value.trim().split(/\s+/) : [value];
  return (
    values.length > 0 &&
    values.length <= (node.css === "padding" ? 4 : 1) &&
    values.every(
      (part) =>
        cssLength.test(part) &&
        (node.percent !== false || !part.endsWith("%")) &&
        (parseFloat(part) === 0 || /[a-z%]$/i.test(part)) &&
        (!node.positive || parseFloat(part) > 0),
    )
  );
}
function validateNode(value, node, path) {
  if (node.type === "object") {
    if (!isTable(value)) throw new ConfigError(path, "expected a table");
    for (const [key, child] of Object.entries(value)) {
      if (!Object.hasOwn(node.properties, key))
        throw new ConfigError(path ? `${path}.${key}` : key, "unknown field");
      validateNode(child, node.properties[key], path ? `${path}.${key}` : key);
    }
  } else if (node.type === "array") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim()))
      throw new ConfigError(path, "expected an array of nonempty strings");
  } else {
    if (
      typeof value !== node.type ||
      (node.type === "number" && (!Number.isFinite(value) || value < node.min || value > node.max))
    )
      throw new ConfigError(
        path,
        `expected ${node.type}${node.type === "number" ? ` between ${node.min} and ${node.max}` : ""}`,
      );
    if (node.integer && !Number.isSafeInteger(value))
      throw new ConfigError(path, "expected a safe integer");
    if (node.enum && !node.enum.includes(value))
      throw new ConfigError(path, `choose ${node.enum.join(", ")}`);
    if (node.css && !validCss(value, node)) throw new ConfigError(path, `invalid CSS ${node.css}`);
  }
}
function merge(base, overrides) {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides))
    result[key] = isTable(value) ? merge(base[key] || {}, value) : copy(value);
  return result;
}
export function resolveConfig(overrides = {}) {
  validateNode(overrides, definition, "");
  const result = merge(defaultSettings, overrides);
  const weather = result.widgets.weather;
  const location = weather.location;
  if ((location.latitude === undefined) !== (location.longitude === undefined))
    throw new ConfigError(
      "widgets.weather.location",
      "latitude and longitude must be supplied together",
    );
  if (weather.location_mode === "configured" && location.latitude === undefined)
    throw new ConfigError(
      "widgets.weather.location",
      "configured mode requires latitude and longitude",
    );
  if (!result.appearance.font.trim() || /[;{}\r\n]/.test(result.appearance.font))
    throw new ConfigError("appearance.font", "expected a font-family value, not CSS declarations");
  try {
    new Intl.DateTimeFormat(result.widgets.date.locale);
  } catch {
    throw new ConfigError("widgets.date.locale", "invalid locale");
  }
  for (const path of ["rift.cli_path", "widgets.github.cli_path", "widgets.wifi.device"])
    if (!getPath(result, path).trim()) throw new ConfigError(path, "cannot be empty");
  try {
    const url = new URL(result.widgets.github.url);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
  } catch {
    throw new ConfigError("widgets.github.url", "expected an HTTP or HTTPS URL");
  }
  return result;
}
export function prune(value) {
  if (!isTable(value)) return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const clean = prune(child);
      return isTable(clean) && !Object.keys(clean).length ? [] : [[key, clean]];
    }),
  );
}
export function parseConfig(source) {
  const overrides = parse(source, { unsafeKeyBehaviour: "throw" });
  try {
    resolveConfig(overrides);
  } catch (error) {
    if (error instanceof ConfigError) {
      let section = "";
      const lines = source.split("\n");
      const line = lines.findIndex((text) => {
        const header = text.match(/^\s*\[([\w.]+)\]/);
        if (header) section = header[1];
        const assignment = text.match(/^\s*([\w.]+)\s*=/);
        const path = assignment ? [section, assignment[1]].filter(Boolean).join(".") : section;
        return path === error.path;
      });
      if (line >= 0) error.message += `, line ${line + 1}`;
    }
    throw error;
  }
  return prune(overrides);
}
export function serializeConfig(overrides) {
  resolveConfig(overrides);
  const result = stringify(prune(overrides)).trimEnd();
  return result ? result + "\n" : "";
}
export const getPath = (object, path) =>
  path.split(".").reduce((value, key) => value?.[key], object);
export function editOverride(overrides, path, value) {
  const result = copy(overrides);
  const keys = path.split(".");
  const leaf = keys.pop();
  let target = result;
  for (const key of keys) target = target[key] ??= {};
  if (value === undefined) delete target[leaf];
  else target[leaf] = value;
  return prune(result);
}
// After an explicit reload, reapply only edited fields to the new file contents.
export function rebaseOverrides(base, draft, next) {
  let result = next;
  function visit(before, after, prefix = "") {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isTable(before[key]) || isTable(after[key]))
        visit(before[key] || {}, after[key] || {}, path);
      else if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        result = editOverride(result, path, after[key]);
    }
  }
  visit(base, draft);
  return result;
}
// GUI previews permit temporarily incomplete values; saving always validates.
export const previewConfig = (overrides) => merge(defaultSettings, overrides);
export function controls(node = definition, prefix = "") {
  return Object.entries(node.properties).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (path === "widgets.weather.location")
      return [{ path, label: child.label, type: "location" }];
    return child.type === "object" ? controls(child, path) : [{ path, ...child }];
  });
}
export function toSchema(node = definition) {
  const result = { type: node.integer ? "integer" : node.type, description: node.label };
  if (node.type === "object") {
    result.additionalProperties = false;
    result.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [key, toSchema(child)]),
    );
  }
  if (node.type === "array") result.items = { type: "string", minLength: 1 };
  if (node.default !== undefined) result.default = node.default;
  if (node.enum) result.enum = node.enum;
  if (Number.isFinite(node.min)) result.minimum = node.min;
  if (Number.isFinite(node.max)) result.maximum = node.max;
  return result;
}
