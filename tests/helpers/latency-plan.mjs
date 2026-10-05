function visible(index, setting) {
  return !setting?.trim() || setting.split(",").map((value) => parseInt(value, 10)).includes(index);
}

export function planLatency(displays, workspaces, settings) {
  const contexts = displays.filter((display) => display.space != null).map((display, i) => {
    const list = workspaces.get(display.uuid) || [];
    const original = list.find((workspace) => workspace.is_active);
    if (!original) throw new Error(`No active workspace on ${display.uuid}`);
    return { ...display, displayIndex: i + 1, original, list };
  });
  const originalDisplay = contexts.find((display) => display.is_active_context) || contexts[0];
  const focus = originalDisplay?.original.windows.find((window) => window.is_focused)?.id;
  const options = settings.spacesDisplay || {};
  const sharedView = originalDisplay && visible(originalDisplay.displayIndex, options.showOnDisplay)
    ? originalDisplay : contexts.find((context) => visible(context.displayIndex, options.showOnDisplay));
  const cases = [];
  for (const context of contexts) {
    if (options.hideEmptySpaces && !context.original.windows.length) continue;
    const alternate = context.list.find((workspace) => workspace.index !== context.original.index &&
      (!options.hideEmptySpaces || workspace.windows.length > 0));
    if (!alternate) continue;
    const view = options.displayAllSpacesOnAllScreens ? sharedView : context;
    if (!view || !visible(view.displayIndex, options.showOnDisplay)) continue;
    cases.push({ displayUuid: context.uuid, screenId: view.screen_id, original: context.original, alternate });
  }
  return { contexts, originalDisplay, focus, cases };
}

// Try every restoration even when an earlier display fails. This runs on the
// host, so a crashed or closed browser cannot strand the desktop mid-test.
export function restoreDesktop(plan, query, execute) {
  const errors = [];
  for (const context of plan.contexts) {
    try {
      const current = query(["query", "workspaces", "--display", context.uuid]).find((workspace) => workspace.is_active);
      if (current?.index !== context.original.index) {
        execute(["execute", "display", "focus", "--uuid", context.uuid]);
        execute(["execute", "workspace", "switch", String(context.original.index)]);
      }
    } catch (error) { errors.push(error); }
  }
  try {
    if (plan.focus) execute(["execute", "window", "focus", "--window-id", JSON.stringify(plan.focus)]);
    else if (plan.originalDisplay) execute(["execute", "display", "focus", "--uuid", plan.originalDisplay.uuid]);
  } catch (error) { errors.push(error); }
  if (errors.length) throw new AggregateError(errors, "Desktop restoration failed");
}
