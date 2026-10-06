import * as Uebersicht from "uebersicht";
import * as Settings from "./settings";

export { parseSnapshot } from "./snapshot.js";

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function cli() {
  return shellQuote(Settings.get().rift.cli_path || "/opt/homebrew/bin/rift-cli");
}

let subscriptionSetup;
let subscriptionCli;

export async function getSnapshot() {
  // The command is called on initial load and each event-triggered refresh.
  // Register only once per widget instance, not once per focus/title event.
  const executable = cli();
  if (subscriptionCli !== executable) {
    subscriptionCli = executable;
    subscriptionSetup = undefined;
  }
  if (!subscriptionSetup) {
    subscriptionSetup = Uebersicht.run(
      `/bin/sh simple-bar/lib/scripts/subscribe-rift.sh ${executable}`,
    ).catch((error) => {
      if (subscriptionCli === executable) subscriptionSetup = undefined;
      throw error;
    });
  }
  await subscriptionSetup;
  try {
    const output = await Uebersicht.run(
      `/bin/sh simple-bar/lib/scripts/init-rift.sh ${executable}`,
    );
    // A failed query may mean Rift restarted and lost its subscriptions.
    if (output.trim() === "riftError") subscriptionSetup = undefined;
    return output;
  } catch (error) {
    subscriptionSetup = undefined;
    throw error;
  }
}

export async function goToSpace(space) {
  // Workspace indexes belong to the target display's current native Space.
  const focusDisplay = `${cli()} execute display focus --uuid ${shellQuote(space.displayUuid)}`;
  const switchWorkspace = `${cli()} execute workspace switch ${shellQuote(space.index)}`;
  // Do not switch an already active workspace, which can trigger back-and-forth.
  await Uebersicht.run(space.focused ? focusDisplay : `${focusDisplay} && ${switchWorkspace}`);
}

export async function focusWindow(id) {
  await Uebersicht.run(
    `${cli()} execute window focus --window-id ${shellQuote(JSON.stringify(id))}`,
  );
}
