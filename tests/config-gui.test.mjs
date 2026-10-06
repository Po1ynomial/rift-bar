import assert from "node:assert/strict";
import { test } from "node:test";
import { createHookHarness } from "./helpers/hooks.mjs";
import { loadModule, React as baseReact } from "./helpers/modules.mjs";
import { editOverride, previewConfig, resolveConfig } from "../lib/config.js";
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
function walk(node, predicate, render = false) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = walk(child, predicate, render);
      if (found) return found;
    }
    return undefined;
  }
  if (predicate(node)) return node;
  if (render && typeof node.type === "function")
    return walk(node.type(node.props), predicate, render);
  return walk(node.props?.children, predicate, render);
}
const button = (tree, title) =>
  walk(tree, (node) => node.type === "button" && node.props.children.includes(title));
async function editor(initialOverrides = {}) {
  const hooks = createHookHarness();
  const React = { ...baseReact, ...hooks.React, Fragment: "fragment", createElement: element };
  let state = {
    overrides: initialOverrides,
    settings: resolveConfig(initialOverrides),
    path: "/config.toml",
    revision: "first",
  };
  let fail = false,
    saves = [],
    refreshes = 0;
  const settings = {
    getState: () => state,
    get: () => state.settings,
    defaultSettings: resolveConfig({}),
    subscribe: () => () => {},
    reload: async () => state.settings,
    set: async (overrides, expected) => {
      if (fail || expected.revision !== state.revision)
        throw new Error("Configuration changed on disk; reload before saving");
      saves.push(structuredClone(overrides));
      state = { ...state, overrides, settings: resolveConfig(overrides), revision: "saved" };
    },
  };
  const { namespace } = await loadModule("lib/components/settings/settings-component.jsx", {
    jsx: true,
    mocks: {
      uebersicht: { React },
      "../../settings.js": settings,
      "../../utils.js": {
        clickEffect: () => {},
        softRefresh: async () => {
          refreshes++;
        },
      },
    },
  });
  return {
    hooks,
    render: () => hooks.render(namespace.default, { closeSettings: () => {} }),
    get saves() {
      return saves;
    },
    get refreshes() {
      return refreshes;
    },
    conflict(next) {
      fail = true;
      state = next;
    },
    clearConflict() {
      fail = false;
    },
    get state() {
      return state;
    },
  };
}

test("GUI editing writes a sparse override and preserves an untouched explicit default", async () => {
  const ui = await editor({ bar: { floating: false } });
  let tree = ui.render();
  const font = walk(
    tree,
    (node) => node.type === "input" && node.props.id === "appearance.font_size",
    true,
  );
  font.props.onChange({ target: { value: "13px" } });
  tree = ui.render();
  await button(tree, "Save changes").props.onClick({});
  assert.deepEqual(ui.saves, [{ bar: { floating: false }, appearance: { font_size: "13px" } }]);
  assert.equal(ui.refreshes, 1);
  assert.equal(button(ui.render(), "Save changes").props.disabled, true);
});

test("GUI resetting an explicit value removes it instead of saving the default", async () => {
  const ui = await editor({ appearance: { font_size: "13px" } });
  const tree = ui.render();
  const field = walk(
    tree,
    (node) =>
      node.type === "div" &&
      node.props.children.some?.((child) => child?.props?.code === "appearance.font_size"),
    true,
  );
  button(field, "Reset").props.onClick();
  const draft = ui.render();
  const font = walk(
    draft,
    (node) => node.type === "input" && node.props.id === "appearance.font_size",
    true,
  );
  assert.equal(font.props.value, "11px");
  await button(draft, "Save changes").props.onClick({});
  assert.deepEqual(ui.saves, [{}]);
});

test("a rejected GUI save retains edits; explicit reload keeps them without losing external fields", async () => {
  const ui = await editor();
  let tree = ui.render();
  walk(
    tree,
    (node) => node.type === "input" && node.props.id === "appearance.font_size",
    true,
  ).props.onChange({ target: { value: "13px" } });
  const external = { appearance: { theme: "dark" }, widgets: { weather: { enabled: true } } };
  ui.conflict({
    overrides: external,
    settings: resolveConfig(external),
    path: "/config.toml",
    revision: "external",
  });
  tree = ui.render();
  await button(tree, "Save changes").props.onClick({});
  tree = ui.render();
  assert.equal(ui.saves.length, 0);
  assert.equal(ui.refreshes, 0);
  assert.match(
    walk(tree, (node) => node.props?.role === "alert").props.children.join(""),
    /changed on disk/,
  );
  assert.equal(
    walk(tree, (node) => node.type === "input" && node.props.id === "appearance.font_size", true)
      .props.value,
    "13px",
  );
  ui.clearConflict();
  await button(tree, "Reload and keep edited fields").props.onClick();
  tree = ui.render();
  await button(tree, "Save changes").props.onClick({});
  assert.deepEqual(ui.saves[0], {
    appearance: { theme: "dark", font_size: "13px" },
    widgets: { weather: { enabled: true } },
  });
});

test("number inputs produce numbers; display selectors persist UUIDs and show display names", async () => {
  const { namespace } = await loadModule("lib/components/settings/settings-item.jsx", {
    jsx: true,
    mocks: { uebersicht: { React: { ...baseReact, createElement: element } } },
  });
  let value;
  const input = namespace.default({
    code: "widgets.cpu.refresh_ms",
    field: { type: "number", min: 250, max: Infinity },
    value: 2000,
    onChange: (next) => {
      value = next;
    },
  });
  input.props.onChange({ target: { value: "3000" } });
  assert.equal(value, 3000);
  input.props.onChange({ target: { value: "" } });
  assert.equal(value, undefined);
  const displays = namespace.default({
    code: "widgets.weather.displays",
    field: { type: "array" },
    value: [],
    onChange: (next) => {
      value = next;
    },
    displayOptions: [
      { uuid: "A", name: "Studio Display" },
      { uuid: "B", index: 2 },
    ],
  });
  assert.equal(displays.props.multiple, true);
  assert.equal(displays.props.children[0][0].props.children[0], "Studio Display");
  displays.props.onChange({ target: { selectedOptions: [{ value: "B" }] } });
  assert.deepEqual(Array.from(value), ["B"]);
});

test("weather location reset also removes configured mode so inheritance remains valid", async () => {
  let overrides = {
    widgets: {
      weather: {
        enabled: true,
        location_mode: "configured",
        location: { label: "Paris", latitude: 48, longitude: 2 },
      },
    },
  };
  const { namespace } = await loadModule("lib/components/settings/settings-inner.jsx", {
    jsx: true,
    mocks: { uebersicht: { React: { ...baseReact, createElement: element } } },
  });
  const tree = namespace.default({
    section: "widgets.weather",
    overrides,
    effective: previewConfig(overrides),
    setOverrides: (fn) => {
      overrides = fn(overrides);
    },
  });
  const location = tree.find(
    (node) => node.props.children[1]?.props?.defaultValue?.label === "Paris",
  );
  button(location, "Reset").props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(overrides)), {
    widgets: { weather: { enabled: true } },
  });
  assert.equal(resolveConfig(overrides).widgets.weather.location_mode, "auto");
  assert.equal(
    editOverride(overrides, "widgets.weather.enabled", false).widgets.weather.enabled,
    false,
  );
});
