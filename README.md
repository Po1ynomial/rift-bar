# rift-bar

A Rift status bar for Übersicht, derived from [Jean Tinland's simple-bar](https://github.com/Jean-Tinland/simple-bar) at revision `fb5cada`. This is an independently maintained local project, not an upstream Rift-support patch. The original MIT license and attribution are retained in `LICENSE`.

## Installation

The source lives at `~/projects/rift-bar`. Übersicht loads it through a symlink named `simple-bar` in its widgets directory:

```sh
ln -s "$HOME/projects/rift-bar" "$HOME/Library/Application Support/Übersicht/widgets/simple-bar"
```

The `simple-bar` installation name is intentional. Widget command paths, CSS classes, browser storage, and the refresh message's widget ID retain that name for compatibility. Übersicht loads and watches source files through the symlink.

Requirements:

- Rift with `rift-cli`, tested with Rift 0.6.2.
- `jq`, available through Homebrew.
- Übersicht at `/Applications/Übersicht.app`, with its local message bus on port `41416`.

Bar preferences remain in `~/.simplebarrc`. Click the bar and press `cmd + ,` to open its settings. The Rift CLI path defaults to `/opt/homebrew/bin/rift-cli`; configure another path for an Intel Homebrew installation or a custom binary. The `simple-bar` widget name, Übersicht application path, and message-bus port are fixed installation requirements, not autodetected options.

Startup loads preferences before generating theme variables or querying Rift. Migration removes explicitly retired backend/server options and the ineffective shell selector. Unknown extension fields, widget preferences, and custom CSS are retained. The saved `$schema` points to this project's schema served by Übersicht, not upstream's schema.

Saves use a temporary file beside the destination and an atomic rename. Existing preference symlinks are followed rather than replaced. Failed writes do not update browser storage or trigger a hard refresh. Missing files use defaults without creating a file; malformed or unreadable files fail startup without overwriting them. An unchanged configuration is not rewritten on startup.

Add this hook to `~/.config/rift/config.toml` to restore subscriptions after Rift restarts. Use the same CLI path as the bar's preferences, and adjust the source path if the checkout moves:

```toml
[settings]
run_on_start = ["/bin/sh \"$HOME/projects/rift-bar/lib/scripts/subscribe-rift.sh\" '/opt/homebrew/bin/rift-cli' --refresh"]
```

Window gaps are configured separately in Rift. Relocating the bar does not change them.

## Refresh and workspace behavior

`lib/scripts/init-rift.sh` queries each display's current native Space, including all its virtual workspaces and windows. Rift screen IDs match Übersicht screen IDs. Clicking a workspace focuses its display before switching the zero-based workspace index. Window clicks use the full Rift window ID.

`lib/scripts/subscribe-rift.sh` registers `workspace_changed`, `windows_changed`, `focused_window_changed`, and `window_title_changed` once per widget instance. Concurrent refreshes share subscription setup. The script resolves its physical directory so invocation from the source path or widget symlink registers identical callbacks. Rift deduplicates them; the script does not remove other integrations' subscriptions. Events send `WIDGET_WANTS_REFRESH` through Übersicht's bundled Node runtime and WebSocket library. Workspace snapshots do not poll while idle.

Snapshots use ordinary JSON parsing with structural validation before rendering. Window titles and workspace names are not repaired or rewritten. A failed Rift query invalidates subscription setup so an error retry can register it again. Error-only retry timers stop when the error view unmounts or recovers. The startup hook is still required after a restart that occurs entirely between queries, because there is no idle polling to detect it.

Native macOS Space creation/deletion is not implemented. Only each display's current native Space is queried.

## Project layout

- `index.jsx` initializes preferences and styles, renders the bar, and runs Rift's event-driven snapshot command.
- `lib/rift.js` handles Rift subscriptions, snapshots, and workspace/window clicks.
- `lib/snapshot.js` validates normalized snapshots without changing their strings.
- `lib/scripts/save-settings.sh` atomically persists preferences.
- `lib/components/workspace-context.jsx` and `lib/components/workspaces/` render snapshots without backend selection or background workspace queries.
- `lib/components/data/` contains the retained data widgets. Their implementations and independently configured refresh intervals are unchanged; the optional simple-bar-server connection has been removed.
- `lib/settings.js` and `lib/schemas/config.json` define settings and preference migration. Core schema parity is checked separately from deferred widget options.
- `tests/` covers real local module exports, startup ordering, atomic persistence, snapshots, Rift commands, restart-hook behavior, recovery timers, and retained widget source checks.

The yabai/AeroSpace backends, native-Space controls, backend chooser, and server hooks are removed. Shared CSS and storage names still use `simple-bar` to preserve existing preferences and custom styles. Links in the settings UI refer only to the original documentation for shared widget/theme options, not Rift behavior.

## Development

```sh
npm ci
npm test
npm run lint
```

Unit tests mock Rift responses and commands. Shell tests use temporary preferences and mock CLI executables; they do not change the running window manager or real preferences. The module-wiring tests replace JSX expressions with `null` for linking, but keep real imports and exports. They are not component-rendering tests.

The optional live latency regression clicks workspace buttons, checks updates below 250ms and no idle snapshot polling, then restores the original workspaces and focused window from the host even if browser evaluation fails. It uses the configured CLI path, with an optional `RIFT_CLI` environment override, and identifies buttons by display UUID and workspace index rather than names. It skips when there are no visible displays with two usable workspaces. With all-display workspace rendering enabled, it also exercises cross-display clicks. It requires `agent-browser` and should run while the desktop is otherwise idle:

```sh
npm run test:latency
```

## Deferred widget work

Widget content and presentation are reserved for a separate redesign. The `Widget`/`Component`/`styles` exports, context fields, preference sections, and `useWidgetRefresh(active, getter, refreshFrequency)` signature remain intact. This pass does not fix retained data-fetching or loading behavior, process-icon sizing, stock quota handling, or the disabled manual Pywal integration.

The widget-option schema still lacks `batteryWidgetOptions.disableCaffeinateInvertedBackground` and places `keyboardMaxLength` under sound instead of keyboard. Full schema validation and widget lifecycle/rendering tests remain deferred. The data-refresh source checks establish only that the hook calls remain and server hooks are absent.

## Local relocation

The original patched checkout, including its upstream Git history, is preserved at `~/Library/Application Support/Übersicht/simple-bar.before-rift-bar`. Preferences before migration are backed up at `~/.simplebarrc.before-rift-bar`. The new repository has its own history and no upstream remote. Its first commit preserves the working patched baseline before cleanup.
