import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSnapshot, buildSpaces } from "../lib/snapshot-build.js";
import { parseSnapshot } from "../lib/snapshot.js";

test("snapshot building folds per-display workspaces into the validated envelope", () => {
  const displays = [
    { uuid: "external", space: 3, screen_id: 7 },
    { uuid: "skipped", space: null, screen_id: 9 },
    { uuid: "internal", space: 9, screen_id: 1 },
  ];
  const workspaces = [
    {
      index: 0,
      name: "Code",
      is_active: true,
      windows: [
        {
          app_name: "kitty",
          title: null,
          id: { pid: 123, idx: 456 },
          is_focused: true,
        },
      ],
    },
  ];
  let spaces = [];
  spaces = buildSpaces(spaces, workspaces, "external", 1);
  spaces = buildSpaces(spaces, [], "internal", 2);
  const snapshot = buildSnapshot(displays, spaces);
  // The builder's output must satisfy the consumer's structural validator.
  const validated = parseSnapshot(JSON.stringify(snapshot));
  assert.deepEqual(
    validated.displays.map(({ uuid, id, index }) => [uuid, id, index]),
    [
      ["external", 7, 1],
      ["internal", 1, 2],
    ],
  );
  assert.equal(validated.spaces.length, 1);
  assert.equal(validated.spaces[0].workspace, "external:0");
  assert.equal(validated.spaces[0].monitor, 1);
  assert.equal(validated.spaces[0].windows[0]["window-title"], "");
  assert.deepEqual(validated.spaces[0].windows[0]["window-id"], { pid: 123, idx: 456 });
});
