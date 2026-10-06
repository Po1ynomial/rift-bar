import { theme as nightShiftDark } from "./night-shift-dark.js";

// Fallback colors for the wallust wallpaper palette. The palette replaces
// every color slot when ~/.config/rift-bar/wallust-dark.json exists and is
// valid; geometry is always inherited from this base.
export const theme = {
  ...nightShiftDark,
  name: "Wallust Dark",
};
