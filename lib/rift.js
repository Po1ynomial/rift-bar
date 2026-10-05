import * as Uebersicht from "uebersicht";
import * as Settings from "./settings";

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function cli() {
  return shellQuote(Settings.get().global.riftPath || "/opt/homebrew/bin/rift-cli");
}

let subscriptionSetup;

export async function getSnapshot() {
  // The command is called on initial load and each event-triggered refresh.
  // Register only once per widget instance, not once per focus/title event.
  if (!subscriptionSetup) {
    subscriptionSetup = Uebersicht.run(
      `/bin/sh simple-bar/lib/scripts/subscribe-rift.sh ${cli()}`,
    ).catch((error) => {
      subscriptionSetup = undefined;
      throw error;
    });
  }
  await subscriptionSetup;
  return Uebersicht.run(`/bin/sh simple-bar/lib/scripts/init-rift.sh ${cli()}`);
}

export async function goToSpace(space) {
  // Rift workspace indexes are per native Space, not global like AeroSpace's.
  const focusDisplay =
    `${cli()} execute display focus --uuid ${shellQuote(space.displayUuid)}`;
  const switchWorkspace =
    `${cli()} execute workspace switch ${shellQuote(space.index)}`;
  // Do not switch an already active workspace, which can trigger back-and-forth.
  await Uebersicht.run(
    space.focused ? focusDisplay : `${focusDisplay} && ${switchWorkspace}`,
  );
}

export async function focusWindow(id) {
  await Uebersicht.run(
    `${cli()} execute window focus --window-id ${shellQuote(JSON.stringify(id))}`,
  );
}
