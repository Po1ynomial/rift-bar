// Build the bar's snapshot envelope from raw rift-cli query output.
// This is the producer half of the contract validated by snapshot.js.

/** One display's workspaces query, folded into the accumulated spaces list. */
export function buildSpaces(previous, workspaces, uuid, monitor) {
  return previous.concat(
    workspaces.map((workspace) => ({
      workspace: `${uuid}:${workspace.index}`,
      name: workspace.name ?? null,
      index: workspace.index,
      displayUuid: uuid,
      focused: workspace.is_active,
      monitor,
      windows: workspace.windows.map((window) => ({
        "app-name": window.app_name,
        "window-title": window.title ?? "",
        "window-id": window.id,
        focused: window.is_focused,
      })),
    })),
  );
}

/** The snapshot envelope: displays keep only entries with a native Space. */
export function buildSnapshot(displays, spaces) {
  const active = displays.filter((display) => display.space != null);
  return {
    displays: active.map((display, key) => ({
      ...display,
      id: display.screen_id,
      index: key + 1,
    })),
    spaces,
  };
}
