import { theme as nightShiftLight } from "./night-shift-light.js";

// Fallback colors for the wallust wallpaper palette. The palette replaces
// every color slot when ~/.config/rift-bar/wallust-light.json exists and is
// valid; geometry is always inherited from this base.
export const theme = {
  ...nightShiftLight,
  name: "Wallust Light",
};
