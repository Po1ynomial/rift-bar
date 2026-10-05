import * as Theme from "../theme";
import * as Settings from "../../settings";

/**
 * Generates CSS variables based on the provided theme scheme.
 *
 * @param {string} scheme - The theme scheme to use for generating CSS variables.
 * @returns {string} The generated CSS variables as a string.
 */
const themedVariables = (scheme, settings) => {
  const { themes } = settings;
  const {
    colorMain,
    colorMainAlt,
    colorMinor,
    colorAccent,
    colorRed,
    colorGreen,
    colorYellow,
    colorOrange,
    colorBlue,
    colorMagenta,
    colorCyan,
    colorBlack,
    colorWhite,
    colorForeground,
    colorBackground,
  } = themes;
  const { widgetMaxWidth, compactMode, font, fontSize } = settings.global;

  return /* css */ `
:root {
  --main: ${colorMain?.trim() || Theme.colors(themes)[scheme].main};
  --main-alt: ${colorMainAlt?.trim() || Theme.colors(themes)[scheme].mainAlt};
  --minor: ${colorMinor?.trim() || Theme.colors(themes)[scheme].minor};
  --accent: ${colorAccent?.trim() || Theme.colors(themes)[scheme].yellow};
  --red: ${colorRed?.trim() || Theme.colors(themes)[scheme].red};
  --green: ${colorGreen?.trim() || Theme.colors(themes)[scheme].green};
  --yellow: ${colorYellow?.trim() || Theme.colors(themes)[scheme].yellow};
  --orange: ${colorOrange?.trim() || Theme.colors(themes)[scheme].orange};
  --blue: ${colorBlue?.trim() || Theme.colors(themes)[scheme].blue};
  --magenta: ${colorMagenta?.trim() || Theme.colors(themes)[scheme].magenta};
  --cyan: ${colorCyan?.trim() || Theme.colors(themes)[scheme].cyan};
  --black: ${colorBlack?.trim() || Theme.colors(themes)[scheme].black};
  --white: ${colorWhite?.trim() || Theme.colors(themes)[scheme].white};
  --foreground: ${
    colorForeground?.trim() || Theme.colors(themes)[scheme].foreground
  };
  --background: ${colorBackground?.trim() || Theme.colors(themes)[scheme].main};
  --transparent-dark: ${Theme.colors(themes)[scheme].transparentDark};
  --font: ${font?.trim() || Theme.colors(themes)[scheme].defaultFont};
  --font-size: ${fontSize.trim().length ? fontSize : "11px"};
  --bar-height: ${
    compactMode
      ? Theme.colors(themes)[scheme].compactBarHeight
      : Theme.colors(themes)[scheme].barHeight
  };
  --bar-radius: ${Theme.colors(themes)[scheme].barRadius};
  --bar-border: ${Theme.colors(themes)[scheme].barBorder};
  --bar-inner-margin: ${Theme.colors(themes)[scheme].barInnerMargin};
  --item-max-width: ${widgetMaxWidth.trim().length ? widgetMaxWidth : "160px"};
  --item-radius: ${Theme.colors(themes)[scheme].itemRadius};
  --item-inner-margin: ${Theme.colors(themes)[scheme].itemInnerMargin};
  --item-outer-margin: ${Theme.colors(themes)[scheme].itemOuterMargin};
  --hover-ring: ${Theme.colors(themes)[scheme].hoverRing};
  --focus-ring: ${Theme.colors(themes)[scheme].focusRing};
  --light-shadow: ${Theme.colors(themes)[scheme].lightShadow};
  --foreground-shadow: ${
    Theme.colors(themes)[scheme].foregroundShadow
      ? Theme.colors(themes)[scheme].foregroundShadow
      : "0 0 0 1px var(--foreground)"
  };
  --transition-easing: ${Theme.colors(themes)[scheme].transitionEasing};
  --click-effect: ${Theme.colors(themes)[scheme].clickEffect};
}
`;
};

// Preserve the styles export, but populate it only after preferences have loaded.
export let styles = "";

/** Build CSS variables from one initialized preference snapshot. */
export function buildStyles(settings = Settings.get()) {
  const darkVariables = themedVariables("dark", settings);
  const lightVariables = themedVariables("light", settings);
  const { theme } = settings.global;
  if (theme === "auto") {
    styles = /* css */ `
      @media (prefers-color-scheme: light) {
        ${lightVariables}
      }
      @media (prefers-color-scheme: dark) {
        ${darkVariables}
      }
    `;
  } else {
    styles = theme === "light" ? lightVariables : darkVariables;
  }
  return styles;
}
