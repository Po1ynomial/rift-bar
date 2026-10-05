// Shared workspace UI with commands supplied by the selected backend.
import * as Settings from "./settings";
import * as Aerospace from "./aerospace";
import * as Rift from "./rift";

export function getDisplayIndex(display) {
  return Settings.get().global.windowManager === "rift"
    ? display.index
    : Aerospace.getDisplayIndex(display);
}

export function goToSpace(space) {
  return Settings.get().global.windowManager === "rift"
    ? Rift.goToSpace(space)
    : Aerospace.goToSpace(space.workspace);
}

export function focusWindow(id) {
  return Settings.get().global.windowManager === "rift"
    ? Rift.focusWindow(id)
    : Aerospace.focusWindow(id);
}
