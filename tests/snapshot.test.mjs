import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSnapshot } from "../lib/snapshot.js";

function fixture() {
  return {
    displays: [
      { uuid: "external", id: 7, index: 1 },
      { uuid: "internal", id: 1, index: 2 },
    ],
    spaces: [
      {
        workspace: "external:0",
        displayUuid: "external",
        monitor: 1,
        index: 0,
        name: "Same name",
        focused: true,
        windows: [
          {
            "app-name": "kitty",
            "window-title": "",
            "window-id": { pid: 123, idx: 456 },
            focused: true,
          },
        ],
      },
      {
        workspace: "internal:0",
        displayUuid: "internal",
        monitor: 2,
        index: 0,
        name: "Same name",
        focused: true,
        windows: [],
      },
    ],
  };
}

test("application snapshot parser preserves arbitrary JSON strings", () => {
  for (const title of [
    '日本語 "quoted"\nnext line',
    "C:\\temp\\file\\",
    "comma ,] [, inside title",
    "\r\n\t",
    "'",
  ]) {
    const data = fixture();
    data.spaces[0].windows[0]["window-title"] = title;
    assert.deepEqual(parseSnapshot(`\n${JSON.stringify(data)}\n`), data);
  }
});

test("empty, disconnected, and reordered display snapshots keep their identities", () => {
  assert.deepEqual(parseSnapshot('{"displays":[],"spaces":[]}'), { displays: [], spaces: [] });
  const data = fixture();
  data.displays.reverse();
  data.displays.forEach((display, i) => {
    display.index = i + 1;
  });
  data.spaces.forEach((space) => {
    space.monitor = data.displays.find((d) => d.uuid === space.displayUuid).index;
  });
  assert.deepEqual(parseSnapshot(JSON.stringify(data)), data);
  data.displays = data.displays.slice(0, 1);
  data.spaces = data.spaces.filter((space) => space.displayUuid === data.displays[0].uuid);
  assert.deepEqual(parseSnapshot(JSON.stringify(data)), data);
});

for (const [name, mutate] of [
  [
    "missing arrays",
    (data) => {
      delete data.spaces;
    },
  ],
  [
    "null display",
    (data) => {
      data.displays[0] = null;
    },
  ],
  [
    "duplicate display",
    (data) => {
      data.displays.push(data.displays[0]);
    },
  ],
  [
    "duplicate workspace",
    (data) => {
      data.spaces.push(data.spaces[0]);
    },
  ],
  [
    "unknown display",
    (data) => {
      data.spaces[0].displayUuid = "missing";
    },
  ],
  [
    "wrong monitor",
    (data) => {
      data.spaces[0].monitor = 2;
    },
  ],
  [
    "negative index",
    (data) => {
      data.spaces[0].index = -1;
    },
  ],
  [
    "invalid focus",
    (data) => {
      data.spaces[0].focused = 1;
    },
  ],
  [
    "missing windows",
    (data) => {
      delete data.spaces[0].windows;
    },
  ],
  [
    "invalid title",
    (data) => {
      data.spaces[0].windows[0]["window-title"] = null;
    },
  ],
  [
    "incomplete window ID",
    (data) => {
      delete data.spaces[0].windows[0]["window-id"].idx;
    },
  ],
]) {
  test(`snapshot rejects ${name} before rendering`, () => {
    const data = fixture();
    mutate(data);
    assert.throws(() => parseSnapshot(JSON.stringify(data)), /Invalid Rift snapshot/);
  });
}

test("snapshot rejects invalid JSON and non-object roots", () => {
  for (const output of ["not JSON", "null", "[]", "1"]) assert.throws(() => parseSnapshot(output));
});
