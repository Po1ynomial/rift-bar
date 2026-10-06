import * as Themes from "./themes";
import { paletteThemes } from "../palette.js";

/**
 * Generates color themes by merging the specified themes with override colors.
 *
 * @param {Object} themes - An object containing the light and dark theme names.
 * @param {string} themes.lightTheme - The name of the light theme.
 * @param {string} themes.darkTheme - The name of the dark theme.
 * @returns {Object} An object containing the light and dark color themes.
 */
export function colors(themes) {
  const palettes = paletteThemes();
  return {
    light: { ...Themes.collection[themes.light_theme], ...palettes[themes.light_theme] },
    dark: { ...Themes.collection[themes.dark_theme], ...palettes[themes.dark_theme] },
  };
}
