import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { spaceStyles } from "../lib/styles/components/spaces/space.js";

// Test the actual pure name renderer without loading Übersicht or compiling JSX.
// It is the final function in wifi.jsx.
const wifiSource = await readFile(
  new URL("../lib/components/data/wifi.jsx", import.meta.url),
  "utf8",
);
const rendererStart = wifiSource.indexOf("function renderName(");
assert.notEqual(rendererStart, -1, "Wi-Fi name renderer is missing");
const renderName = runInNewContext(`(${wifiSource.slice(rendererStart)})`);

function declarations(selector) {
  const rule = spaceStyles.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`));
  assert.ok(rule, `Missing CSS rule for ${selector}`);
  return Object.fromEntries(
    rule[1]
      .trim()
      .split(";")
      .filter(Boolean)
      .map((declaration) => {
        const separator = declaration.indexOf(":");
        return [declaration.slice(0, separator).trim(), declaration.slice(separator + 1).trim()];
      }),
  );
}

test("Wi-Fi hides a macOS-redacted SSID", () => {
  assert.equal(renderName("<redacted>", false), "");
});

test("Wi-Fi preserves real names and existing display options", () => {
  assert.equal(renderName("Home Wi-Fi", false), "Home Wi-Fi");
  assert.equal(renderName("Home Wi-Fi", true), "");
  assert.equal(renderName("", false), "");
  assert.equal(renderName(undefined, false), "");
  assert.equal(renderName("with an AirPort network.y off.", false), "Disabled");
  assert.equal(renderName("with an AirPort network.", false), "Searching...");
});

test("workspace buttons use the configured font size", () => {
  assert.equal(declarations("\\.space__inner")["font-size"], "var(--font-size)");
});

test("workspace app icons scale with the configured font size", () => {
  const icon = declarations("\\.space__icon");
  assert.equal(icon.width, "var(--font-size)");
  assert.equal(icon.height, "var(--font-size)");
  assert.equal(icon.flex, "0 0 var(--font-size)");
});
