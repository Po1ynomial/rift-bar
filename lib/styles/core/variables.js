import * as Theme from "../theme.js";
import * as Settings from "../../settings.js";

const targets = {
  clock: ".data-widget.time",
  date: ".data-widget.date-display",
  battery: ".data-widget.battery",
  wifi: ".data-widget.wifi",
  volume: ".data-widget.sound",
  microphone: ".data-widget.mic",
  keyboard: ".data-widget.keyboard",
  cpu: ".data-widget.cpu",
  memory: ".data-widget.memory",
  network_stats: ".data-widget.netstats",
  notifications: ".notifications .notification-pill",
  weather: ".data-widget.weather",
  github: ".data-widget.github",
  zoom: ".data-widget.zoom",
};
function declarations(colors, focused = false) {
  const foreground = focused ? colors.focused_foreground : colors.foreground;
  const background = focused ? colors.focused_background : colors.background;
  return `${foreground !== undefined ? `color: ${foreground};` : ""}${background !== undefined ? `background-color: ${background};` : ""}`;
}
function overrides(selector, value, scheme, focusedSelector) {
  const colors = { ...value, ...value[scheme] };
  const normal = declarations(colors);
  const focused = declarations(colors, true);
  return `${normal ? `.rift-bar ${selector} {${normal}}` : ""}${focusedSelector && focused ? `.rift-bar ${focusedSelector} {${focused}}` : ""}`;
}
function themedVariables(scheme, settings) {
  const theme = Theme.colors(settings.appearance)[scheme];
  const { bar, appearance } = settings;
  const variables = {
    main: theme.main,
    "main-alt": theme.mainAlt,
    minor: theme.minor,
    accent: theme.yellow,
    red: theme.red,
    green: theme.green,
    yellow: theme.yellow,
    orange: theme.orange,
    blue: theme.blue,
    magenta: theme.magenta,
    cyan: theme.cyan,
    black: theme.black,
    white: theme.white,
    foreground: theme.foreground,
    background: theme.main,
    "transparent-dark": theme.transparentDark,
    "bar-foreground": bar.colors.foreground ?? theme.foreground,
    "bar-background": bar.colors.background ?? theme.main,
    font: appearance.font,
    "font-size": appearance.font_size,
    "bar-foreground-height": bar.foreground_height ?? theme.barHeight,
    "bar-radius": bar.radius ?? theme.barRadius,
    "bar-border": theme.barBorder,
    "bar-inner-margin": bar.padding ?? theme.barInnerMargin,
    "bar-outer-margin": bar.edge_padding,
    "item-max-width": "160px",
    "item-radius": theme.itemRadius,
    "item-inner-margin": theme.itemInnerMargin,
    "item-outer-margin": theme.itemOuterMargin,
    "hover-ring": theme.hoverRing,
    "focus-ring": theme.focusRing,
    "light-shadow": theme.lightShadow,
    "foreground-shadow": theme.foregroundShadow || "0 0 0 1px var(--foreground)",
    "transition-easing": theme.transitionEasing,
    "click-effect": theme.clickEffect,
  };
  return (
    `:root {${Object.entries(variables)
      .map(([key, value]) => `--${key}: ${value};`)
      .join("\n")}}\n` +
    Object.entries(targets)
      .map(([id, selector]) => overrides(selector, settings.widgets[id].style, scheme))
      .join("\n") +
    overrides(
      ".space:not(.space--focused) .space__inner",
      settings.workspaces.style,
      scheme,
      ".space--focused .space__inner",
    ) +
    overrides(
      ".process__window:not(.process__window--focused)",
      settings.process.style,
      scheme,
      ".process__window--focused",
    )
  );
}
export let styles = "";
export function buildStyles(settings = Settings.get()) {
  const { theme } = settings.appearance;
  styles =
    theme === "auto"
      ? `@media (prefers-color-scheme: light) {${themedVariables("light", settings)}}\n@media (prefers-color-scheme: dark) {${themedVariables("dark", settings)}}`
      : themedVariables(theme, settings);
  return styles;
}
