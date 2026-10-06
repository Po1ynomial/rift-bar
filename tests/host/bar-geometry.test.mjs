import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { resolveConfig } from "../../lib/config.js";
import { styles as base } from "../../lib/styles/core/base.js";
import { styles as processStyles } from "../../lib/styles/components/process.js";
import { spaceStyles } from "../../lib/styles/components/spaces/space.js";
import { dataWidgetStyles } from "../../lib/styles/components/data/data-widget.js";
import { settingsStyles } from "../../lib/styles/components/settings/settings.js";
import { loadModule, React } from "../helpers/modules.mjs";
import { readFile } from "node:fs/promises";

function browser(session, ...args) {
  const input = args[0] === "eval" ? args[1] : undefined;
  const command = input === undefined ? args : ["eval", "--stdin"];
  const result = spawnSync(
    "agent-browser",
    ["--session", session, "--headed", "false", "--json", ...command],
    { encoding: "utf8", timeout: 30000, input },
  );
  assert.equal(
    result.status,
    0,
    result.error?.message || result.stderr || result.stdout || "agent-browser failed",
  );
  const response = JSON.parse(result.stdout);
  assert.equal(response.success, true, JSON.stringify(response.error));
  return response.data;
}

test("foreground height stays fixed while outer padding, border, floating, and background vary", async (t) => {
  if (spawnSync("agent-browser", ["--version"]).error)
    return t.skip("agent-browser is not installed");
  const session = `rift-bar-geometry-${process.pid}`;
  const { namespace: variables } = await loadModule("lib/styles/core/variables.js", {
    mocks: { uebersicht: { React } },
  });
  const spaceGroup = await readFile(
    new URL("../../lib/styles/components/spaces/spaces.js", import.meta.url),
    "utf8",
  );
  const spaceCss = spaceGroup
    .slice(spaceGroup.indexOf("`") + 1, spaceGroup.lastIndexOf("`"))
    .replace("${spaceStyles}", spaceStyles);
  const cases = [];
  for (const background of [true, false])
    for (const floating of [true, false])
      for (const centered of [true, false])
        for (const foreground_height of ["34px", "40px", "2.5em"])
          for (const [padding, vertical, horizontal] of [
            ["0px", 0, 0],
            ["4px 8px", 8, 16],
            ["2px 8px 6px", 8, 16],
            ["2px 7px 6px 9px", 8, 16],
            ["0.25em 0.5em", 8, 16],
          ]) {
            const settings = resolveConfig({
              appearance: { theme: "light", font_size: "16px" },
              bar: { background, floating, padding, foreground_height },
              process: { centered },
            });
            const classes = `rift-bar${floating ? " rift-bar--floating" : ""}${background ? "" : " rift-bar--no-bar-background"}`;
            const html = `<div class="${classes}"><div class="settings"><div class="settings__outer">Settings</div></div><div class="rift-bar__foreground"><div class="spaces"><div class="space"><button class="space__inner">1</button></div></div><div class="process${centered ? " process--centered" : ""}"><div class="process__container"><button class="process__window">Editor</button></div></div><div class="rift-bar__data"><div class="data-widget">12:34</div></div></div></div>`;
            cases.push({
              background,
              floating,
              centered,
              padding,
              vertical,
              horizontal,
              foreground:
                parseFloat(foreground_height) * (foreground_height.endsWith("em") ? 16 : 1),
              css: [
                base,
                spaceCss,
                processStyles,
                dataWidgetStyles,
                settingsStyles,
                variables.buildStyles(settings),
                ".rift-bar {border:2px solid black}",
              ].join("\n"),
              html,
            });
          }
  try {
    browser(session, "open", "about:blank");
    const data = browser(
      session,
      "eval",
      `(async () => {
      const rows = [];
      for (const item of ${JSON.stringify(cases)}) {
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:200px';
        document.body.appendChild(frame);
        try {
          frame.srcdoc = '<!doctype html><style>' + item.css + '</style>' + item.html;
          await new Promise(resolve => frame.onload = resolve);
          const doc = frame.contentDocument;
          const box = selector => { const r=doc.querySelector(selector).getBoundingClientRect(); return {height:r.height,width:r.width,y:r.y,bottom:r.bottom}; };
          rows.push({background:item.background,floating:item.floating,centered:item.centered,padding:item.padding,vertical:item.vertical,horizontal:item.horizontal,expectedForeground:item.foreground,outer:box('.rift-bar'),foreground:box('.rift-bar__foreground'),workspace:box('.space__inner'),process:box('.process__window'),widget:box('.data-widget'),panel:box('.settings__outer')});
        } finally { frame.remove(); }
      }
      return rows;
    })()`,
    );
    for (const row of data.result) {
      const label = JSON.stringify({
        background: row.background,
        floating: row.floating,
        centered: row.centered,
        padding: row.padding,
      });
      assert.equal(row.foreground.height, row.expectedForeground, label);
      assert.equal(row.outer.height, row.expectedForeground + row.vertical + 4, label);
      assert.equal(row.outer.width, row.floating ? 990 : 1000, label);
      assert.equal(row.foreground.width, row.outer.width - row.horizontal - 4, label);
      const buttonHeight = row.expectedForeground - (row.background ? 0 : 8);
      assert.equal(row.workspace.height, buttonHeight, label);
      assert.equal(row.process.height, buttonHeight, label);
      assert.equal(row.widget.height, buttonHeight, label);
      assert.equal(row.workspace.y, row.process.y, label);
      assert.ok(row.panel.y >= row.outer.bottom + 8, label);
    }
  } finally {
    browser(session, "close");
  }
});
