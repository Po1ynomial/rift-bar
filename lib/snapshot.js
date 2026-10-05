function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function integer(value, minimum = 0) {
  return Number.isSafeInteger(value) && value >= minimum;
}

function check(condition, field) {
  if (!condition) throw new TypeError(`Invalid Rift snapshot: ${field}`);
}

/** Parse the shell snapshot without repairing or changing JSON string contents. */
export function parseSnapshot(output) {
  const data = JSON.parse(output);
  check(object(data) && Array.isArray(data.displays) && Array.isArray(data.spaces), "displays/spaces");
  const displays = new Map();
  const ids = new Set();
  const indexes = new Set();
  for (const display of data.displays) {
    check(object(display) && typeof display.uuid === "string" && display.uuid.length > 0, "display UUID");
    check(integer(display.id) && integer(display.index, 1), "display ID/index");
    check(!displays.has(display.uuid) && !ids.has(display.id) && !indexes.has(display.index), "duplicate display");
    displays.set(display.uuid, display);
    ids.add(display.id);
    indexes.add(display.index);
  }
  const workspaces = new Set();
  for (const space of data.spaces) {
    check(object(space) && typeof space.workspace === "string" && space.workspace.length > 0, "workspace identity");
    check(!workspaces.has(space.workspace), "duplicate workspace");
    workspaces.add(space.workspace);
    check(displays.has(space.displayUuid) && displays.get(space.displayUuid).index === space.monitor, "workspace display");
    check(integer(space.index) && typeof space.focused === "boolean", "workspace index/focus");
    check(space.name == null || typeof space.name === "string", "workspace name");
    check(Array.isArray(space.windows), "workspace windows");
    for (const window of space.windows) {
      check(object(window), "window");
      check(typeof window["app-name"] === "string" && typeof window["window-title"] === "string", "window app/title");
      check(typeof window.focused === "boolean", "window focus");
      const id = window["window-id"];
      check(object(id) && integer(id.pid) && integer(id.idx), "window ID");
    }
  }
  return data;
}
