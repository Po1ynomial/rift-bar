import * as Uebersicht from "uebersicht";
import * as Themes from "./styles/themes";
import * as Utils from "./utils";
import UserWidgetsCreator from "./components/settings/user-widgets-creator.jsx";
import WeatherLocationPicker from "./components/settings/weather-location-picker.jsx";

export { Component, styles, Wrapper } from "./components/settings/settings.jsx";

const SETTINGS_STORAGE_KEY = "simple-bar-settings";

// The available themes are retrieved from the Themes collection
// They are then split into dark and light themes
const availableThemes = Object.keys(Themes.collection).map((key) => {
  const theme = Themes.collection[key];
  return { code: key, name: theme.name, kind: theme.kind };
});
const darkThemes = availableThemes.filter((theme) => theme.kind === "dark");
const lightThemes = availableThemes.filter((theme) => theme.kind === "light");

// These are all the information displayed in the settings module
export const data = {
  global: {
    label: "Global",
    infos: [
      '- "<b>No bar background</b>" is visually better with the "Floating bar" option activated',
      '- The higher the "<b>Sliding animation pace</b>" value, the faster the texts slides (must be > 0, default is set to 4)',
      "<br/>",
      '<b>"Use background color as foreground"</b>:',
      "This setting will remove all background colors and use the removed color for all the foreground texts",
    ],
  },
  theme: {
    label: "theme",
    type: "radio",
    options: ["auto", "dark", "light"],
    title: "Appearance & tweaks",
  },
  floatingBar: { label: "Floating bar", type: "checkbox" },
  noBarBg: { label: "No bar background", type: "checkbox" },
  noColorInData: { label: "No colors in data", type: "checkbox" },
  bottomBar: { label: "Bottom bar", type: "checkbox" },
  sideDecoration: { label: "Apple logo", type: "checkbox" },
  disableAnimations: {
    label: "Disable persistent animations",
    type: "checkbox",
  },
  enableMissives: {
    label: "Use internal notification system (missives)",
    type: "checkbox",
    fullWidth: true,
  },
  disableNotifications: { label: "Disable notifications", type: "checkbox" },
  compactMode: { label: "Compact mode", type: "checkbox" },
  widgetMaxWidth: { label: "Widget max width", type: "text" },
  widgetsBackgroundColorAsForeground: {
    label: "Use background color as foreground for widgets",
    type: "checkbox",
    fullWidth: true,
  },
  spacesBackgroundColorAsForeground: {
    label: "Use background color as foreground for spaces & process",
    type: "checkbox",
    fullWidth: true,
  },
  font: {
    label: "Global font",
    type: "text",
    placeholder: "default: JetBrains Mono",
    fullWidth: false,
  },
  fontSize: {
    label: "Font size",
    type: "text",
    placeholder: "default: 11px",
    fullWidth: false,
  },
  riftPath: {
    label: "Rift CLI path",
    type: "text",
    placeholder: "default: /opt/homebrew/bin/rift-cli",
    fullWidth: true,
  },
  terminal: {
    title: "Which terminal should user facing commands be run in?",
    label: "",
    type: "radio",
    options: ["Terminal", "iTerm2"],
  },
  slidingAnimationPace: {
    label: "Sliding animation speed",
    type: "number",
    placeholder: "Default: 4",
    fullWidth: true,
  },

  themes: {
    label: "Themes",
    documentation: "/themes-settings/",
    infos: [
      "Colors defined here will override the selected theme. Leave it empty to use the theme colors.",
      "<br/>",
      "<b>You can use any valid CSS color:</b>",
      "- named-color",
      "- hex-color",
      "- rgb()",
      "- hsl()",
      "- hwb()",
      "<br/>",
      "<b>Styles are applied in this order:</b>",
      "- Theme",
      "- Color overrides",
      "- Custom styles",
      "<br/>",
      "The last one overrides the previous ones.",
    ],
  },
  darkTheme: { label: "Dark theme", type: "select", options: darkThemes },
  lightTheme: { label: "Light theme", type: "select", options: lightThemes },
  colorMain: { label: "Main", type: "color", title: "Color overrides" },
  colorMainAlt: { label: "Main alternative", type: "color" },
  colorMinor: { label: "Minor", type: "color" },
  colorAccent: { label: "Accent", type: "color" },
  colorRed: { label: "Red", type: "color" },
  colorGreen: { label: "Green", type: "color" },
  colorYellow: { label: "Yellow", type: "color" },
  colorOrange: { label: "Orange", type: "color" },
  colorBlue: { label: "Blue", type: "color" },
  colorMagenta: { label: "Magenta", type: "color" },
  colorCyan: { label: "Cyan", type: "color" },
  colorBlack: { label: "Black", type: "color" },
  colorWhite: { label: "White", type: "color" },
  colorForeground: { label: "Foreground", type: "color" },
  colorBackground: { label: "Background", type: "color" },

  process: {
    label: "Process",
  },
  displayOnlyCurrent: {
    label:
      "Display only current process name",
    type: "checkbox",
    fullWidth: true,
  },
  centered: {
    label: "Center process widget",
    type: "checkbox",
  },
  hideWindowTitle: {
    label:
      "Hide window titles (show only app name for each process)",
    type: "checkbox",
    fullWidth: true,
  },
  displayOnlyIcon: {
    label: "Display only process icon",
    type: "checkbox",
    fullWidth: true,
  },
  expandAllProcesses: {
    label: "Expand all processes",
    type: "checkbox",
    fullWidth: true,
  },

  spacesDisplay: {
    label: "Spaces",
    infos: [
      "You can declare here which apps to exclude from the spaces display",
      'Each exclusion must be separated by a comma and a space ", "',
      "These exclusions will also be applied on the process name display",
    ],
  },
  exclusions: {
    label: "Exclusions by app name",
    type: "text",
    placeholder: "example: Finder, iTerm2",
    fullWidth: true,
  },
  titleExclusions: {
    label: "Exclusions by window title name",
    type: "text",
    placeholder: "example: Preferences",
    fullWidth: true,
  },
  exclusionsAsRegex: {
    label:
      "Use regex syntax in all exclusions fields",
    type: "checkbox",
    fullWidth: true,
  },
  displayAllSpacesOnAllScreens: {
    label:
      "Display all spaces on all screens",
    type: "checkbox",
    fullWidth: true,
  },
  hideEmptySpaces: {
    label: "Hide empty spaces",
    type: "checkbox",
  },
  hideDuplicateAppsInSpaces: {
    label:
      "Hide duplicate app icons in same space",
    type: "checkbox",
    fullWidth: true,
  },

  widgets: {
    label: "Widgets",
    documentation: "/widgets/",
  },
  processWidget: { label: "Process name", type: "checkbox" },
  zoomWidget: { label: "Zoom", type: "checkbox" },
  timeWidget: { label: "Time", type: "checkbox" },
  dateWidget: { label: "Date", type: "checkbox" },
  wifiWidget: { label: "Network", type: "checkbox" },

  micWidget: { label: "Microphone", type: "checkbox" },
  soundWidget: { label: "Sound", type: "checkbox" },
  githubWidget: { label: "GitHub", type: "checkbox" },
  weatherWidget: { label: "Weather", type: "checkbox" },
  netstatsWidget: { label: "Network stats", type: "checkbox" },
  cpuWidget: { label: "CPU", type: "checkbox" },

  memoryWidget: { label: "Memory", type: "checkbox" },
  batteryWidget: { label: "Battery", type: "checkbox" },
  keyboardWidget: { label: "Keyboard", type: "checkbox" },

  notificationsWidget: { label: "Notification badges", type: "checkbox" },

  showOnDisplay: {
    label: "Show on display n°",
    type: "text",
    placeholder: "example: 1,2 (leave blank to show on all displays)",
    fullWidth: true,
  },

  githubWidgetOptions: {
    label: "GitHub",
    documentation: "/github/",
  },
  hideWhenNoNotification: {
    label: "Hide widget when no notification",
    type: "checkbox",
  },
  notificationUrl: {
    label: "The URL opened on click",
    type: "text",
    placeholder: "example: https://github.com/notifications",
    fullWidth: true,
  },
  ghBinaryPath: {
    label: "Path to gh binary",
    type: "text",
    placeholder: "example: /opt/homebrew/bin/gh",
    fullWidth: true,
  },

  weatherWidgetOptions: {
    label: "Weather",
    infos: [
      "Forecasts are provided by Open-Meteo.",
      "Configured mode uses the coordinates selected below and does not require location permission.",
      "Automatic mode uses browser geolocation. If permission is denied, choose a configured location.",
    ],
  },
  locationMode: {
    label: "location mode",
    type: "radio",
    options: ["configured", "auto"],
  },
  showIcon: { label: "Show icon", type: "checkbox" },
  unit: {
    title: "Temperature unit",
    label: "",
    type: "radio",
    options: ["C", "F"],
  },
  hideLocation: { label: "Hide location", type: "checkbox" },
  hideGradient: { label: "Hide gradient", type: "checkbox" },
  weatherLocation: {
    type: "component",
    Component: WeatherLocationPicker,
    fullWidth: true,
  },

  netstatsWidgetOptions: {
    label: "Network stats",
    documentation: "/network-stats/",
    infos: [
      "Here you can set the refresh frequency of the widget.",
      "The default value is set to 2000 ms (2 seconds).",
    ],
  },
  netstatsThreshold: {
    label: "Hide below (kb/s)",
    type: "number",
    placeholder: "0 to always show",
  },

  cpuWidgetOptions: {
    label: "CPU usage",
    documentation: "/cpu/",
    infos: [
      "Here you can set the refresh frequency of the widget.",
      "The default value is set to 2000 ms (2 seconds).",
    ],
  },
  cpuUsageThreshold: {
    label: "Hide below (%)",
    type: "number",
    placeholder: "0 to always show",
  },

  memoryWidgetOptions: {
    label: "Memory pressure",
    documentation: "/memory-pressure/",
    infos: [
      "Here you can set the refresh frequency of the widget.",
      "The default value is set to 4000 ms (4 seconds).",
    ],
  },
  memoryUsageThreshold: {
    label: "Hide below (%)",
    type: "number",
    placeholder: "0 to always show",
  },

  displayAsGraph: {
    label: "Display as graph",
    type: "checkbox",
    fullWidth: true,
  },

  cpuMonitorApp: {
    title: "Cpu monitor app",
    label: "",
    type: "radio",
    options: ["Top", "Activity Monitor", "None"],
  },

  memoryMonitorApp: {
    title: " app",
    label: "",
    type: "radio",
    options: ["Top", "Activity Monitor", "None"],
  },

  batteryWidgetOptions: {
    label: "Battery",
    documentation: "/battery/",
    infos: [
      "no option (default) — Prevent the system from sleeping, not the display",
      "-d — Prevent the display from sleeping.",
      "-i — Prevent the system from idle sleeping.",
      "-s — Prevent the system from sleeping. This is valid only when system is running on AC power.",
      "-u — Declare that a user is active. If the display is off, this option turns the display on and prevents the display from going into idle sleep.",
      "-t 60 — Specifies the timeout value in seconds for which the command is valid.",
    ],
  },

  toggleCaffeinateOnClick: {
    label: "Toggle caffeinate on click",
    type: "checkbox",
    fullWidth: true,
  },
  disableCaffeinateInvertedBackground: {
    label: "Disable caffeinate inverted background",
    type: "checkbox",
    fullWidth: true,
  },
  caffeinateOption: {
    label: "Caffeinate options",
    type: "text",
    placeholder: "example: -d",
  },

  networkWidgetOptions: {
    label: "Network",
    documentation: "/network/",
    infos: [
      "Here you can override the default displayed network source.",
      "And also turn Wifi on / off when clicking the Wifi icon.",
      "Additionally, you can choose to hide the network name for privacy.",
    ],
  },

  networkDevice: {
    label: "Network device source name",
    type: "text",
    placeholder: "example: en0",
  },
  hideWifiIfDisabled: { label: "Hide if disabled", type: "checkbox" },
  toggleWifiOnClick: { label: "Toggle Wifi onclick", type: "checkbox" },
  hideNetworkName: { label: "Hide network name", type: "checkbox" },

  zoomWidgetOptions: {
    label: "Zoom status",
    documentation: "/zoom/",
  },

  showVideo: { label: "Show video status", type: "checkbox" },
  showMic: { label: "Show mic status", type: "checkbox" },

  soundWidgetOptions: {
    label: "Sound",
    documentation: "/sound/",
  },

  micWidgetOptions: {
    label: "Mic",
    documentation: "/microphone/",
  },

  keyboardWidgetOptions: {
    label: "Keyboard",
    documentation: "/keyboard/",
  },
  keyboardMaxLength: {
    label: "Characters to display",
    type: "number",
    placeholder: "0 to show full name",
  },

  timeWidgetOptions: {
    label: "Time",
    documentation: "/time/",
  },

  hour12: { label: "12h time format", type: "checkbox" },
  dayProgress: { label: "Day progress", type: "checkbox" },
  showSeconds: { label: "Show seconds", type: "checkbox" },

  dateWidgetOptions: {
    label: "Date",
    documentation: "/date/",
  },

  shortDateFormat: { label: "Short format", type: "checkbox" },
  locale: { label: "Locale", type: "text", placeholder: "example: en-UK" },
  calendarApp: {
    label: "Calendar App",
    type: "text",
    placeholder: "example: Fantastical",
    fullWidth: true,
  },

  excludedApps: {
    label: "Excluded apps (comma-separated app names)",
    type: "text",
    placeholder: "example: BetterTouchTool, Xcode",
    fullWidth: true,
  },
  notificationsWidgetOptions: {
    label: "Notification badges",
    documentation: "/notifications/",
    infos: [
      "Shows notification badge counts from running macOS apps.",
      "Click any badge to open that application.",
      'Each app exclusion must be separated by a comma and a space ", "',
    ],
  },

  userWidgets: {
    label: "User widgets",
    documentation: "/custom-widgets/",
  },
  userWidgetsList: { type: "component", Component: UserWidgetsCreator },

  refreshFrequency: { label: "Refresh frequency (in ms)", type: "number" },

  customStyles: {
    label: "Custom styles",
    documentation: "/custom-styles/",
  },
  styles: {
    label: "Styles",
    type: "textarea",
    fullWidth: true,
    minHeight: 240,
  },
};

// Default settings are defined here
export const defaultSettings = {
  global: {
    theme: "auto",
    compactMode: false,
    floatingBar: false,
    noBarBg: false,
    noColorInData: false,
    bottomBar: false,
    sideDecoration: false,
    disableAnimations: false,
    spacesBackgroundColorAsForeground: false,
    widgetsBackgroundColorAsForeground: false,
    widgetMaxWidth: "160px",
    slidingAnimationPace: 4,
    font: "JetBrains Mono, Monaco, Menlo, monospace",
    fontSize: "11px",
    riftPath: "/opt/homebrew/bin/rift-cli",
    terminal: "Terminal",
    disableNotifications: false,
    enableMissives: false,
  },
  themes: {
    lightTheme: "NightShiftLight",
    darkTheme: "NightShiftDark",
    colorMain: "",
    colorMainAlt: "",
    colorMinor: "",
    colorAccent: "",
    colorRed: "",
    colorGreen: "",
    colorYellow: "",
    colorOrange: "",
    colorBlue: "",
    colorMagenta: "",
    colorCyan: "",
    colorBlack: "",
    colorWhite: "",
    colorForeground: "",
    colorBackground: "",
  },
  process: {
    showOnDisplay: "",
    displayOnlyCurrent: false,
    centered: false,
    hideWindowTitle: false,
    displayOnlyIcon: false,
    expandAllProcesses: false,
  },
  spacesDisplay: {
    showOnDisplay: "",
    exclusions: "",
    titleExclusions: "",
    exclusionsAsRegex: false,
    displayAllSpacesOnAllScreens: false,
    hideDuplicateAppsInSpaces: false,
    hideEmptySpaces: false,
  },
  widgets: {
    processWidget: true,
    githubWidget: false,
    weatherWidget: false,
    netstatsWidget: false,
    cpuWidget: false,

    memoryWidget: false,
    batteryWidget: true,
    wifiWidget: true,

    zoomWidget: false,
    soundWidget: true,
    micWidget: false,
    dateWidget: true,
    timeWidget: true,
    keyboardWidget: false,

    notificationsWidget: false,

  },
  githubWidgetOptions: {
    refreshFrequency: 1000 * 60 * 10,
    showOnDisplay: "",
    showIcon: true,
    hideWhenNoNotification: false,
    notificationUrl: "https://github.com/notifications",
    ghBinaryPath: "/opt/homebrew/bin/gh",
  },
  weatherWidgetOptions: {
    refreshFrequency: 1000 * 60 * 30,
    showOnDisplay: "",
    showIcon: true,
    unit: "C",
    hideLocation: false,
    hideGradient: false,
    locationMode: "auto",
    weatherLocation: { label: "", latitude: null, longitude: null },
  },
  netstatsWidgetOptions: {
    refreshFrequency: 2000,
    showOnDisplay: "",
    showIcon: true,
    displayAsGraph: false,
    netstatsThreshold: 0,
  },
  cpuWidgetOptions: {
    refreshFrequency: 2000,
    showOnDisplay: "",
    showIcon: true,
    displayAsGraph: false,
    cpuUsageThreshold: 0,
    cpuMonitorApp: "Activity Monitor",
  },

  memoryWidgetOptions: {
    refreshFrequency: 4000,
    showOnDisplay: "",
    showIcon: true,
    memoryUsageThreshold: 0,
    memoryMonitorApp: "Activity Monitor",
  },
  batteryWidgetOptions: {
    refreshFrequency: 10000,
    showOnDisplay: "",
    showIcon: true,
    toggleCaffeinateOnClick: true,
    disableCaffeinateInvertedBackground: false,
    caffeinateOption: "",
  },
  networkWidgetOptions: {
    refreshFrequency: 20000,
    showOnDisplay: "",
    showIcon: true,
    networkDevice: "en0",
    hideWifiIfDisabled: false,
    toggleWifiOnClick: false,
    hideNetworkName: false,
  },

  zoomWidgetOptions: {
    refreshFrequency: 5000,
    showOnDisplay: "",
    showVideo: true,
    showMic: true,
  },
  soundWidgetOptions: {
    refreshFrequency: 20000,
    showOnDisplay: "",
    showIcon: true,
  },
  micWidgetOptions: {
    refreshFrequency: 20000,
    showOnDisplay: "",
    showIcon: true,
  },
  dateWidgetOptions: {
    refreshFrequency: 30000,
    showOnDisplay: "",
    showIcon: true,
    shortDateFormat: true,
    locale: "en-UK",
    calendarApp: "",
  },
  timeWidgetOptions: {
    refreshFrequency: 1000,
    showOnDisplay: "",
    showIcon: true,
    hour12: false,
    dayProgress: true,
    showSeconds: false,
  },
  keyboardWidgetOptions: {
    refreshFrequency: 20000,
    showOnDisplay: "",
    showIcon: true,
    keyboardMaxLength: 0,
  },

  notificationsWidgetOptions: {
    refreshFrequency: 10000,
    showOnDisplay: "",
    excludedApps: "",
  },

  userWidgets: {
    userWidgetsList: {},
  },
  customStyles: {
    styles: "/* your custom css styles here */",
  },
};

// User widget default settings
export const userWidgetDefault = {
  title: "Your widget name",
  icon: "Widget",
  backgroundColor: "--main-alt",
  output: 'echo "Hello world!"',
  onClickAction: "",
  onRightClickAction: "",
  onMiddleClickAction: "",
  refreshFrequency: 10000,
  showOnDisplay: "",
  active: true,
  noIcon: false,
  hideWhenNoOutput: true,
};

// Colors available for user widgets
export const userWidgetColors = [
  "--main",
  "--main-alt",
  "--minor",
  "--accent",
  "--red",
  "--green",
  "--yellow",
  "--orange",
  "--blue",
  "--magenta",
  "--cyan",
];

/**
 * Retrieves the application settings from local storage.
 * If no settings are found, the default settings are used.
 * The settings schema is removed before returning the settings.
 *
 * @returns {Object} The application settings.
 */
export function get() {
  const storedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  return normalizeSettings(storedSettings ? JSON.parse(storedSettings) : {});
}

/**
 * Updates the settings by merging them with the schema, saving them to a config file,
 * and storing them in the local storage.
 *
 * @param {Object} newSettings - The new settings to be applied.
 * @returns {Promise<void>} A promise that resolves when the settings have been saved.
 */
export async function set(newSettings) {
  const settingsWithSchema = withSchema(normalizeSettings(newSettings));
  await saveToConfigFile(settingsWithSchema);
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(settingsWithSchema),
  );
}

/**
 * Saves the provided settings to the configuration file.
 *
 * @param {Object} newSettings - The new settings to be saved.
 * @returns {Promise<void>} A promise that resolves when the settings have been saved.
 * @throws Will throw an error if the settings cannot be saved.
 */
async function saveToConfigFile(newSettings) {
  const json = JSON.stringify(newSettings, undefined, 2).replace(/'/g, "'\"'\"'");
  await Uebersicht.run(
    `printf '%s\\n' '${json}' | /bin/sh simple-bar/lib/scripts/save-settings.sh`,
  );
}

/**
 * Checks if the configuration file for simple-bar exists.
 *
 * This function runs a shell command to check for the presence of the
 * configuration file located at `~/.simplebarrc`. If the file exists,
 * the function returns `true`; otherwise, it returns `false`.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the
 * configuration file exists, and `false` otherwise.
 */
export async function checkIfConfigFileExists() {
  return Boolean(await Uebersicht.run(
    'if test -e "$HOME/.simplebarrc"; then printf present; elif test -L "$HOME/.simplebarrc"; then exit 1; fi',
  ));
}

const retiredWidgets = [
  "gpu", "nextMeeting", "crypto", "stock", "spotify", "youtubeMusic",
  "music", "mpd", "browserTrack", "vpn",
];

const retiredOptions = {
  global: [
    "shell", "windowManager", "yabaiPath", "aerospacePath", "enableServer",
    "serverHttpPort", "serverSocketPort", "yabaiServerRefresh",
    "aerospaceServerRefresh", "inlineSpacesOptions",
  ],
  process: [
    "displayForFocusedSpace", "showCurrentSpaceMode", "displaySkhdMode",
    "displayStackIndex", "displayOnlyCurrentStack",
  ],
  spacesDisplay: [
    "spacesExclusions", "displayStickyWindowsSeparately", "hideCreateSpaceButton",
    "showOptionsOnHover", "switchSpacesWithoutYabai", "customAeroSpaceDisplayIndexes",
  ],
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Only known retired keys are removed. Retained widget and extension fields survive.
function normalizeSettings(config) {
  if (!isObject(config)) throw new TypeError("Preferences must be a JSON object");
  for (const section of Object.keys(defaultSettings)) {
    if (Object.hasOwn(config, section) && !isObject(config[section])) {
      throw new TypeError(`Preferences section '${section}' must be an object`);
    }
  }
  for (const section of Object.keys(defaultSettings)) {
    for (const [key, value] of Object.entries(config[section] || {})) {
      if (Object.hasOwn(defaultSettings[section], key) && (typeof value !== typeof defaultSettings[section][key]
        || (typeof value === "number" && !Number.isFinite(value)))) {
        throw new TypeError(`Invalid preference type: ${section}.${key}`);
      }
    }
  }
  if (config.global?.theme !== undefined && !["auto", "light", "dark"].includes(config.global.theme)) {
    throw new TypeError("Invalid preference: global.theme");
  }
  const settings = Utils.mergeDeep({}, defaultSettings, config);
  for (const [section, keys] of Object.entries(retiredOptions)) {
    for (const key of keys) delete settings[section][key];
  }
  for (const name of retiredWidgets) {
    delete settings.widgets[`${name}Widget`];
    delete settings[`${name}WidgetOptions`];
  }
  const weather = settings.weatherWidgetOptions;
  const legacyLocation = config.weatherWidgetOptions?.customLocation;
  if (legacyLocation !== undefined && config.weatherWidgetOptions?.weatherLocation === undefined) {
    if (typeof legacyLocation !== "string") throw new TypeError("Invalid preference: weatherWidgetOptions.customLocation");
    weather.locationMode = config.weatherWidgetOptions.locationMode ?? (legacyLocation.trim() ? "configured" : "auto");
    weather.weatherLocation.label = /^(null|undefined|none)$/i.test(legacyLocation.trim()) ? "" : legacyLocation.trim();
  }
  delete weather.customLocation;
  if (!["auto", "configured"].includes(weather.locationMode) || !["C", "F"].includes(weather.unit)) {
    throw new TypeError("Invalid weather location mode or temperature unit");
  }
  const location = weather.weatherLocation;
  if (!isObject(location) || typeof location.label !== "string"
    || ![location.latitude, location.longitude].every((value) => value === null || (typeof value === "number" && Number.isFinite(value)))
    || (location.latitude !== null && Math.abs(location.latitude) > 90)
    || (location.longitude !== null && Math.abs(location.longitude) > 180)) {
    throw new TypeError("Invalid weather coordinates");
  }
  delete settings.widgets.dndWidget;
  delete settings.widgets.undefined;
  delete settings.$schema;
  return settings;
}

function withSchema(settings) {
  return {
    $schema: "http://127.0.0.1:41416/simple-bar/lib/schemas/config.json",
    ...settings,
  };
}

function sameConfig(a, b) {
  if (a === b) return true;
  if (!isObject(a) || !isObject(b)) return JSON.stringify(a) === JSON.stringify(b);
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(
    (key) => Object.hasOwn(b, key) && sameConfig(a[key], b[key]),
  );
}

async function readExternalConfig() {
  if (!await checkIfConfigFileExists()) return;
  return JSON.parse(await Uebersicht.run('cat "$HOME/.simplebarrc"'));
}

/** Load preferences, rejecting malformed or unreadable files without replacing them. */
export async function loadExternalConfig() {
  const config = await readExternalConfig();
  return config === undefined ? undefined : normalizeSettings(config);
}

let initialization;

/** Share an in-flight load. The entry point caches a fully initialized startup. */
export function init() {
  if (!initialization) {
    initialization = initialize().finally(() => {
      initialization = undefined;
    });
  }
  return initialization;
}

async function initialize() {
  const config = await readExternalConfig();
  if (config === undefined) return get();
  const settings = normalizeSettings(config);
  const migrated = withSchema(settings);
  if (!sameConfig(config, migrated)) await saveToConfigFile(migrated);
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
  return settings;
}
