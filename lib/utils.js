import * as Uebersicht from "uebersicht";
import * as Settings from "./settings";

/*!
  Copyright (c) 2017 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
const hasOwn = {}.hasOwnProperty;

/**
 * Combines multiple class names into a single string.
 *
 * @param {...(string|boolean|undefined|null)} arguments - The class names to combine.
 * Each argument can be a string, boolean, undefined, or null. Only truthy values will be included.
 * @returns {string} The combined class names.
 */
export function classNames() {
  let classes = "";

  for (let i = 0; i < arguments.length; i++) {
    const arg = arguments[i];
    if (arg) {
      classes = appendClass(classes, parseValue(arg));
    }
  }

  return classes;
}

function parseValue(arg) {
  if (typeof arg === "string" || typeof arg === "number") {
    return arg;
  }
  if (typeof arg !== "object") {
    return "";
  }
  if (Array.isArray(arg)) {
    return classNames.apply(null, arg);
  }
  if (
    arg.toString !== Object.prototype.toString &&
    !arg.toString.toString().includes("[native code]")
  ) {
    return arg.toString();
  }

  let classes = "";
  for (let key in arg) {
    if (hasOwn.call(arg, key) && arg[key]) {
      classes = appendClass(classes, key);
    }
  }
  return classes;
}

function appendClass(value, newClass) {
  if (!newClass) {
    return value;
  }
  if (value) {
    return value + " " + newClass;
  }
  return value + newClass;
}
/*!
  End of Jed Watson's classNames
*/

const WIDTH = 20;
const DURATION = 320;

const CACHE_PREFIX = "rb_cmd_";
const CACHE_CLEANUP_INTERVAL = 300000; // Clean up every 5 minutes
let _lastCleanup = 0;
const pendingCommands = new Map();

/**
 * Simple string hash for generating cache keys from command strings.
 * @param {string} str - The string to hash.
 * @returns {string} A base-36 hash string.
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Removes expired cache entries from localStorage to prevent unbounded growth.
 * Uses a conservative 60-second grace period beyond the longest widget refresh.
 */
function cleanupExpiredCache() {
  const now = Date.now();
  if (now - _lastCleanup < CACHE_CLEANUP_INTERVAL) return;
  _lastCleanup = now;

  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            // Remove if older than 60 seconds (well beyond any widget refresh)
            if (now - parsed.t > 60000) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Remove malformed entries
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Runs a shell command via Uebersicht.run() with cross-display caching.
 *
 * In multi-display setups, each display runs its own rift-bar instance.
 * System-wide data (CPU, memory, battery, etc.) is identical across displays,
 * so this function uses localStorage (shared across all Übersicht WebViews)
 * to cache command results and prevent redundant execution.
 *
 * Expired cache entries are automatically cleaned up every 5 minutes.
 *
 * @param {string} command - The shell command to execute.
 * @param {number} cacheTimeout - How long (ms) the cached result remains valid.
 *   Typically set to the widget's refresh frequency so that within one refresh
 *   cycle, only one display actually executes the command.
 * @param {Object} options - Optional cache controls.
 * @param {boolean} options.force - Bypass stored results, sharing any in-flight command.
 * @returns {Promise<string>} The command output (from cache or fresh execution).
 */
export async function cachedRun(command, cacheTimeout, { force = false } = {}) {
  if (pendingCommands.has(command)) return pendingCommands.get(command);
  const cacheable = Number.isFinite(cacheTimeout) && cacheTimeout > 0;
  const cacheKey = CACHE_PREFIX + hashString(command);
  if (cacheable) {
    cleanupExpiredCache();
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!force && cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.t < cacheTimeout) return parsed.r;
      }
    } catch {
      // Storage is optional. Command execution must still work without it.
    }
  }
  const pending = Promise.resolve()
    .then(() => Uebersicht.run(command))
    .then((result) => {
      if (cacheable) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ r: result, t: Date.now() }));
        } catch {
          // Ignore cache write errors, including storage quota failures.
        }
      }
      return result;
    })
    .finally(() => pendingCommands.delete(command));
  pendingCommands.set(command, pending);
  return pending;
}

/**
 * Creates a click effect animation at the location of the mouse click event.
 *
 * @param {MouseEvent} e - The mouse event object containing the click coordinates.
 */
export function clickEffect(e) {
  if (!Settings.get().interaction.click_effect) return;
  const { body } = document;
  const { clientX, clientY } = e;
  const cursor = Object.assign(document.createElement("div"), {
    id: "rift-bar-click-effect",
  });
  Object.assign(cursor.style, {
    top: `${clientY - WIDTH / 2}px`,
    left: `${clientX - WIDTH / 2}px`,
    width: `${WIDTH}px`,
    height: `${WIDTH}px`,
    transition: `transform ${DURATION} ease`,
  });
  if (cursor && "animate" in cursor) {
    body.appendChild(cursor);
    cursor.animate(
      [
        { opacity: 0, transform: "scale(0)" },
        { opacity: 1, transform: "scale(2)" },
        { opacity: 0, transform: "scale(1.6)" },
      ],
      { duration: DURATION },
    );
  }
  setTimeout(() => {
    if (cursor.parentNode === body) body.removeChild(cursor);
  }, DURATION);
}

/**
 * Filters applications based on provided exclusions and title exclusions.
 *
 * @param {Object} app - The application object to be filtered.
 * @param {Array<string>} exclusions - List of application names to be excluded.
 * @param {Array<string>} titleExclusions - List of application titles to be excluded.
 * @returns {boolean} - Returns true if the application should be included, false otherwise.
 */
export function filterApps(app, exclusions, titleExclusions) {
  return !exclusions.includes(app["app-name"]) && !titleExclusions.includes(app["window-title"]);
}
/**
 * Softly refreshes the Uebersicht widget with the specified ID.
 *
 * This function runs an AppleScript command to refresh the widget with the ID "rift-bar-index-jsx"
 * in the Uebersicht application.
 *
 * @async
 * @function softRefresh
 * @returns {Promise<void>} A promise that resolves when the refresh command has been executed.
 */
export async function softRefresh() {
  await Uebersicht.run(
    `osascript -e 'tell application id "tracesOf.Uebersicht" to refresh widget id "rift-bar-index-jsx"'`,
  );
}

/**
 * Triggers a hard refresh of the Uebersicht application by running an AppleScript command.
 *
 * @async
 * @function hardRefresh
 * @returns {Promise<void>} A promise that resolves when the refresh command has been executed.
 */
export async function hardRefresh() {
  await Uebersicht.run(`osascript -e 'tell application id "tracesOf.Uebersicht" to refresh'`);
}

/**
 * Displays a notification using either the pushMissive function or the system notification.
 *
 * @param {string} content - The content of the notification.
 * @param {Function} pushMissive - A function to push a missive notification.
 * @param {Object} [options] - Optional settings for the notification.
 * @param {string} [options.side="right"] - The side where the notification should appear.
 * @param {number} [options.delay=5000] - The delay before the notification disappears.
 */
export function notification(content, pushMissive, { side = "right", delay = 5000 } = {}) {
  const settings = Settings.get();
  const mode = settings.interaction.notifications;
  if (mode === "off") return;
  if (mode === "bar" && typeof pushMissive === "function") {
    pushMissive({ side, content, delay });
  } else {
    Uebersicht.run(
      `osascript -e 'tell app "System Events" to display notification "${content}" with title "rift-bar"'`,
    );
  }
}

/**
 * Injects styles into the document head. If styles with the given ID already exist, it updates them.
 * Otherwise, it creates a new style element and appends it to the document head.
 *
 * @param {string} id - The ID to assign to the style element.
 * @param {string[]} [styles=[]] - An array of CSS styles to inject.
 */
export function injectStyles(id, styles = []) {
  const existingStyles = document.getElementById(id);
  // Merge all styles and minify them
  const stylesToInject = styles.join("").replace(/\s+/g, " ");
  if (existingStyles) {
    existingStyles.innerHTML = stylesToInject;
    return;
  }
  document.head.appendChild(
    Object.assign(document.createElement("style"), {
      id,
      innerHTML: stylesToInject,
    }),
  );
}

const DEFAULT_PACE = 4;

/**
 * Starts the sliding animation for a given container.
 *
 * @param {HTMLElement} container - The container element that holds the inner and slider elements.
 * @param {string} innerSelector - The CSS selector for the inner element.
 * @param {string} sliderSelector - The CSS selector for the slider element.
 */
export function startSliding(container, innerSelector, sliderSelector) {
  if (!container) return;
  const settings = Settings.get();
  const { text_scroll_speed: slidingAnimationPace = DEFAULT_PACE } = settings.appearance;
  const pace =
    !slidingAnimationPace || slidingAnimationPace < 1
      ? DEFAULT_PACE
      : parseInt(slidingAnimationPace);
  const inner = container.querySelector(innerSelector);
  const slider = container.querySelector(sliderSelector);
  const delta = inner.clientWidth - slider.clientWidth;
  if (delta > 0) return;
  const timing = Math.round((Math.abs(delta) * 100) / pace);
  Object.assign(slider.style, {
    transform: `translateX(${delta}px)`,
    transition: `transform ${timing}ms linear`,
  });
}

/**
 * Stops the sliding effect by removing the inline style of the slider element.
 *
 * @param {HTMLElement} container - The container element that holds the slider.
 * @param {string} sliderSelector - The CSS selector for the slider element.
 */
export function stopSliding(container, sliderSelector) {
  if (!container) return;
  container.querySelector(sliderSelector).removeAttribute("style");
}

/**
 * Cleans up the given output by trimming whitespace and removing all newline characters.
 *
 * @param {string} output - The string output to be cleaned.
 * @returns {string} - The cleaned output string.
 */
export function cleanupOutput(output) {
  return output?.trim().replace(/(\r\n|\n|\r)/gm, "");
}

/**
 * Adds event listeners to handle focus and blur events on the bar element.
 *
 * This function selects the element with the class "rift-bar" and adds
 * event listeners for "click" and "mouseleave" events. When the bar is clicked,
 * it checks if the click target is the bar itself and then calls the `focusBar` function.
 * When the mouse leaves the bar, it calls the `blurBar` function.
 */
export function handleBarFocus(bar = document.querySelector(".rift-bar")) {
  if (!bar) return;
  const click = (event) => {
    if (event.target === bar) bar.classList.add("rift-bar--focused");
  };
  const blur = () => bar.classList.remove("rift-bar--focused");
  bar.addEventListener("click", click);
  bar.addEventListener("mouseleave", blur);
  return () => {
    bar.removeEventListener("click", click);
    bar.removeEventListener("mouseleave", blur);
  };
}
/**
 * Removes the "rift-bar--focused" class from the element with the class "rift-bar".
 * If the element is not found, the function does nothing.
 */
export function blurBar() {
  const bar = document.querySelector(".rift-bar");
  if (!bar) return;
  bar.classList.remove("rift-bar--focused");
}

/**
 * Retrieves the system architecture.
 *
 * This function runs two shell commands using Uebersicht to get the system's
 * architecture and system type. It then processes the output to determine
 * if the system is using an ARM64 architecture or x86_64.
 *
 * The result is cached permanently (in memory and localStorage) since
 * system architecture never changes at runtime.
 *
 * @returns {Promise<"arm64" | "x86_64">} A promise that resolves to a string indicating the system architecture ("arm64" or "x86_64").
 */
let _cachedSystem = null;

export async function getSystem() {
  if (_cachedSystem) return _cachedSystem;
  try {
    const stored = localStorage.getItem("sb_system_arch");
    if (stored) {
      _cachedSystem = stored;
      return _cachedSystem;
    }
  } catch {
    // Ignore localStorage errors
  }
  const [bareArchitecture, bareSystem] = await Promise.all([
    Uebersicht.run("uname -a"),
    Uebersicht.run("uname -m"),
  ]);
  const architecture = cleanupOutput(bareArchitecture);
  const system = cleanupOutput(bareSystem);
  if (
    system.startsWith("arm64") ||
    (system.startsWith("x86_64") && architecture.includes("ARM64"))
  ) {
    _cachedSystem = "arm64";
  } else {
    _cachedSystem = "x86_64";
  }
  try {
    localStorage.setItem("sb_system_arch", _cachedSystem);
  } catch {
    // Ignore localStorage errors
  }
  return _cachedSystem;
}

/**
 * Checks if a display is visible based on the provided setting.
 *
 * @param {string} displayUuid - The current display UUID.
 * @param {string[]} displays - Allowed UUIDs; an empty array means all.
 * @returns {boolean} - Returns true if the display is visible, otherwise false.
 */
export function isVisibleOnDisplay(displayUuid, displays = []) {
  return displays.length === 0 || displays.includes(displayUuid);
}
/**
 * Adds a value to the graph history and ensures the graph does not exceed the specified maximum length.
 *
 * @param {any} value - The value to add to the graph history.
 * @param {function} setGraph - The state setter function for updating the graph.
 * @param {number} maxLength - The maximum length of the graph history.
 */
export function addToGraphHistory(value, setGraph, maxLength) {
  setGraph((graph) => {
    const newGraph = [...graph, value];
    if (newGraph.length > maxLength) {
      newGraph.shift();
    }
    return newGraph;
  });
}

/**
 * Executes a given command in the user's preferred terminal application.
 *
 * The terminal application is determined by the global settings.
 * Supported terminals are "Terminal" and "iTerm2".
 *
 * @param {string} command - The command to be executed in the terminal.
 */
export function runInUserTerminal(command) {
  const settings = Settings.get();
  const { terminal } = settings.interaction;
  switch (terminal) {
    case "terminal":
      Uebersicht.run(
        `osascript ./rift-bar/lib/scripts/run-command-in-terminal.applescript` + ` "${command}"`,
      );
      break;
    case "iterm2":
      Uebersicht.run(
        `osascript ./rift-bar/lib/scripts/run-command-in-iterm2.applescript` + ` "${command}"`,
      );
      break;
    default:
      break;
  }
}

/**
 * Formats a given number of bytes into a more readable string with appropriate units.
 *
 * @param {number} bytes - The number of bytes to format.
 * @param {number} [decimals=1] - The number of decimal places to include in the formatted string.
 * @returns {string} The formatted string with the appropriate unit.
 */
export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0b";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["b", "kb", "mb", "gb", "tb", "pb", "eb", "zb", "yb"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}<em>${sizes[i]}</em>`;
}

/**
 * Normalizes an application name by removing any left-to-right mark characters (U+200E).
 *
 * @param {string} name - The application name to normalize.
 * @returns {string} The normalized application name without left-to-right mark characters.
 */
export function normalizeAppName(name) {
  if (!name) return "";
  return name.replace(/[\u200E]/g, "");
}
