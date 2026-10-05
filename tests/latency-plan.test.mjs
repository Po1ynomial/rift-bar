import assert from "node:assert/strict";
import { test } from "node:test";
import { planLatency, restoreDesktop } from "./helpers/latency-plan.mjs";

const displays = [
  { uuid: "external", screen_id: 7, space: 3, is_active_context: false },
  { uuid: "internal", screen_id: 1, space: 9, is_active_context: true },
];
const workspace = (index, active, windows = []) => ({ index, is_active: active, name: "Duplicate name", windows });
const focus = { pid: 123, idx: 456 };
const workspaces = new Map([
  ["external", [workspace(0, true), workspace(1, false)]],
  ["internal", [workspace(0, true, [{ id: focus, is_focused: true }]), workspace(1, false)]],
]);

test("live planning identifies duplicate-named workspaces by display and index", () => {
  const plan = planLatency(displays, workspaces, {});
  assert.equal(plan.originalDisplay.uuid, "internal");
  assert.deepEqual(plan.focus, focus);
  assert.deepEqual(plan.cases.map(({ displayUuid, screenId, alternate }) => [displayUuid, screenId, alternate.index]), [
    ["external", 7, 1], ["internal", 1, 1],
  ]);
});

test("all-display mode exercises cross-display clicks through the active display's bar", () => {
  const plan = planLatency(displays, workspaces, { spacesDisplay: { displayAllSpacesOnAllScreens: true } });
  assert.deepEqual(plan.cases.map((item) => item.screenId), [1, 1]);
});

test("insufficient or hidden workspaces are skipped without modifying the desktop", () => {
  assert.equal(planLatency(displays, workspaces, { spacesDisplay: { hideEmptySpaces: true } }).cases.length, 0);
  assert.equal(planLatency([], new Map(), {}).cases.length, 0);
  assert.equal(planLatency(displays, workspaces, { spacesDisplay: { showOnDisplay: "99" } }).cases.length, 0);
});

test("empty originals are not chosen when they would disappear after switching", () => {
  const list = new Map([["external", [workspace(0, true), workspace(1, false, [{ id: focus }])]]]);
  assert.equal(planLatency([displays[0]], list, { spacesDisplay: { hideEmptySpaces: true } }).cases.length, 0);
});

test("all-display mode can use another visible bar when the active display's bar is hidden", () => {
  const plan = planLatency(displays, workspaces, { spacesDisplay: { displayAllSpacesOnAllScreens: true, showOnDisplay: "1" } });
  assert.deepEqual(plan.cases.map((item) => item.screenId), [7, 7]);
});

test("restoration attempts every display and full focused-window ID even after failure", () => {
  const plan = planLatency(displays, workspaces, {});
  const commands = [];
  assert.throws(() => restoreDesktop(plan, () => [workspace(1, true)], (args) => {
    commands.push(args);
    if (args.includes("external")) throw new Error("External display disappeared");
  }), /Desktop restoration failed/);
  assert.ok(commands.some((args) => args.includes("internal")));
  assert.deepEqual(commands.at(-1), ["execute", "window", "focus", "--window-id", JSON.stringify(focus)]);
});

test("restoration does not switch already-active workspaces", () => {
  const plan = planLatency(displays, workspaces, {});
  const commands = [];
  restoreDesktop(plan, () => [workspace(0, true)], (args) => commands.push(args));
  assert.deepEqual(commands, [["execute", "window", "focus", "--window-id", JSON.stringify(focus)]]);
});
