import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./helpers/modules.mjs";

async function loadUtils(settings) {
  const calls = [];
  const missives = [];
  const { namespace } = await loadModule("lib/utils.js", {
    mocks: {
      uebersicht: {
        run: async (command) => {
          calls.push(command);
          return "";
        },
      },
      "./settings": { get: () => settings },
    },
  });
  return { utils: namespace, calls, missives };
}

const interaction = (overrides = {}) => ({
  terminal: "terminal",
  notifications: "system",
  click_effect: false,
  ...overrides,
});

test("terminal commands pass through argv quoting, never raw interpolation", async () => {
  const { utils, calls } = await loadUtils({ interaction: interaction() });
  utils.runInUserTerminal("top");
  assert.equal(
    calls[0],
    "osascript ./rift-bar/lib/scripts/run-command-in-terminal.applescript 'top'",
  );
  const hostile = `top"; osascript -e 'tell app "Terminal" to do script "rm -rf ~"`;
  utils.runInUserTerminal(hostile);
  assert.equal(
    calls[1],
    `osascript ./rift-bar/lib/scripts/run-command-in-terminal.applescript '${hostile.replace(/'/g, `'"'"'`)}'`,
  );
  assert.ok(!calls[1].includes(`"${hostile}"`));
});

test("iterm2 uses its own script; unknown terminals run nothing", async () => {
  const { utils, calls } = await loadUtils({ interaction: interaction({ terminal: "iterm2" }) });
  utils.runInUserTerminal("top");
  assert.match(calls[0], /run-command-in-iterm2\.applescript 'top'$/);
  const quiet = await loadUtils({ interaction: interaction({ terminal: "other" }) });
  quiet.utils.runInUserTerminal("top");
  assert.equal(quiet.calls.length, 0);
});

test("system notifications quote AppleScript string content", async () => {
  const { utils, calls } = await loadUtils({ interaction: interaction() });
  utils.notification('Wi-Fi "disabled"\\now');
  assert.equal(
    calls[0],
    `osascript -e 'tell app "System Events" to display notification "Wi-Fi \\"disabled\\"\\\\now" with title "rift-bar"'`,
  );
});

test("notification modes route to missives or silence", async () => {
  const { utils, calls } = await loadUtils({ interaction: interaction({ notifications: "bar" }) });
  const pushed = [];
  utils.notification("hello", (missive) => pushed.push(missive));
  assert.equal(calls.length, 0);
  assert.equal(pushed.length, 1);
  assert.deepEqual({ ...pushed[0] }, { side: "right", content: "hello", delay: 5000 });
  const off = await loadUtils({ interaction: interaction({ notifications: "off" }) });
  off.utils.notification("hello", () => assert.fail("no missive expected"));
  assert.equal(off.calls.length, 0);
});
