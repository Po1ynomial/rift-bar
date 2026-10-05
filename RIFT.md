# Local Rift integration

This checkout supports Rift 0.6.2 through `rift-cli`. It does not require yabai, AeroSpace, simple-bar-server, or disabling SIP.

Select `rift` in the Global settings and set the Rift CLI path to `/opt/homebrew/bin/rift-cli`. The selection is saved in `~/.simplebarrc`. This local checkout also defaults to Rift. After changing the window manager, refresh Übersicht to reload the widget command.

`lib/scripts/init-rift.sh` queries displays and each display's native Space on initial load and on Rift events. It includes all virtual workspaces and their windows, then normalizes the snapshot for the existing AeroSpace workspace and process components. Rift screen IDs match Übersicht screen IDs directly. Clicking a workspace focuses its display before switching its zero-based workspace index. Window clicks use Rift's full window ID rather than a macOS window-server ID.

`lib/scripts/subscribe-rift.sh` registers `workspace_changed`, `windows_changed`, `focused_window_changed`, and `window_title_changed`. Identical subscriptions are deduplicated by Rift; the script never removes other integrations' subscriptions. Each event runs `refresh-rift.sh`, which sends `WIDGET_WANTS_REFRESH` through Übersicht's existing local WebSocket message bus. It uses Übersicht's bundled Node runtime and WebSocket library, not AppleScript or an additional server. The widget registers subscriptions once when loaded. A `settings.run_on_start` hook in Rift's config restores them and refreshes the bar when Rift restarts.

The adapter needs `jq`, available here at `/opt/homebrew/bin/jq`. The script includes the usual Apple Silicon and Intel Homebrew paths. Übersicht is installed at `/Applications/Übersicht.app` and its message bus runs on port 41416. If Rift is stopped or a query fails, the bar shows an error and retries. During normal operation, there is no periodic workspace polling.

Rift's top outer gap is currently `8.0`, configured by the user after hiding the macOS menu bar. The event-driven refresh change does not alter margins. The original integration backup remains at `~/.config/rift/config.toml.before-simple-bar`.

Rift uses its event subscriptions, not simple-bar-server's yabai or AeroSpace refresh options. Native macOS Space creation/deletion and yabai-specific layout controls are not implemented. Only each display's current native Space is queried.

These are local changes, not upstream simple-bar support. Replacing or resetting this widget checkout will remove the adapter.

## Tests

```sh
node --experimental-vm-modules --test tests/rift.test.mjs
```

The unit tests use mocked Rift responses and window-manager commands. They do not change the running window manager.

The live latency regression briefly switches workspaces and restores the initial workspace and focused window. It fails if any measured bar update exceeds 250ms or snapshot queries continue while idle. Run it while the desktop is otherwise idle. Before the fix, updates took 692-878ms in this test; with subscriptions and the bundled runtime, they took 103-138ms.

```sh
node tests/rift-latency.mjs
```
