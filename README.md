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
- `lib/widgets/` defines widget resources and data collectors. `lib/hooks/use-widget.js` connects their snapshots to React.
- `lib/components/data/` renders the retained widgets and handles user actions. Collectors do not own loading flags or polling timers.
- `lib/settings.js` and `lib/schemas/config.json` define settings and preference migration. Schema/default parity includes every retained widget and custom-widget field.
- `tests/` covers module exports, startup, persistence, Rift snapshots and commands, recovery, widget resources, collector fixtures, weather, preference migration, and widget element trees.

The yabai/AeroSpace backends, native-Space controls, backend chooser, and server hooks are removed. Shared CSS and storage names still use `simple-bar` to preserve existing preferences and custom styles. Links in the settings UI refer only to the original documentation for shared widget/theme options, not Rift behavior.

## Development

```sh
npm ci
npm test
npm run lint
```

Unit tests mock Rift responses, system commands, geolocation, and weather HTTP responses. Shell tests use temporary preferences and mock CLI executables; they do not change the running window manager or real preferences. Module-wiring tests replace JSX with `null` for linking. Widget-view tests separately compile JSX into element trees and exercise loading, success, stale, failure, and disabled states. These tests do not simulate browser layout or the React DOM renderer.

The optional live latency regression clicks workspace buttons, checks updates below 250ms and no idle snapshot polling, then restores the original workspaces and focused window from the host even if browser evaluation fails. It uses the configured CLI path, with an optional `RIFT_CLI` environment override, and identifies buttons by display UUID and workspace index rather than names. It skips when there are no visible displays with two usable workspaces. With all-display workspace rendering enabled, it also exercises cross-display clicks. It requires `agent-browser` and should run while the desktop is otherwise idle:

```sh
npm run test:latency
```

## Retained widgets

Builtins are retained for current use, not possible future use. The bar keeps clock, date, battery/caffeinate, Wi-Fi, output and input volume, keyboard layout, CPU, memory, network statistics, Dock notification badges, weather, GitHub, and Zoom. Rift workspaces and windows remain core bar functionality. Custom shell widgets remain available because their removal has not been selected.

GPU/macmon, next meeting/icalBuddy, stock, crypto, Viscosity VPN, Spotify, Music/iTunes, YouTube Music, MPD, browser-track scripts, and playback decoration have been removed. Migration deletes their known toggles and option sections while preserving unrelated extension fields, custom widgets, and custom CSS. System collectors keep their existing macOS commands. Zoom still depends on its application UI and automation permissions. GitHub requires an authenticated `gh`; an absent binary produces an unavailable state.

## Widget protocol

A definition declares a stable `id`, a positive default `refreshFrequency`, a `load({ config, signal, force })` function, and a snapshot validator. Views call `useWidget(definition, active, config)` and receive `data`, `status`, `error`, `updatedAt`, and `refresh`. Existing `Widget` and `styles` exports remain the entry point's rendering interface. Configuration defaults, controls, and schema entries remain in the settings module.

The resource owns polling, a 15-second load deadline, bounded retry backoff, loading/error transitions, and cleanup. It allows one in-flight load per resource, validates results before publication, preserves the last successful snapshot as stale on failure, and ignores results from disposed resources. Missing dependencies use `unavailable` instead of endless loading. Invalid or nonpositive refresh intervals use the widget default; positive intervals have a 250ms lower bound. Manual refreshes and error retries bypass the command-result cache.

Shell commands cannot be physically cancelled through Übersicht's `run` API. After a deadline the resource exits loading and ignores late results, but does not overlap a stuck collector with another attempt. A disposed resource never publishes. Fetch and geolocation collectors honor the abort signal. Command results are cached in shared browser storage across display instances; concurrent commands within one instance share an in-flight promise. Separate WebViews may still race on an initially empty cache.

## Weather

Weather uses [Open-Meteo](https://open-meteo.com/) current temperature and WMO weather codes, plus sunrise/sunset times. It never sends a city name or placeholder to the forecast endpoint.

In settings, choose `configured` location mode, search for a city or postal code, select the intended result, and save. Alternatively enter latitude and longitude directly. The selected coordinates and label are persisted in `weatherWidgetOptions.weatherLocation`. Configured mode does not request location permission. Automatic mode uses standard browser geolocation coordinates with a five-second timeout and reports permission denial or unavailable location without guessing a city.

Legacy nonempty `customLocation` values become configured labels without guessed coordinates. Select a search result once to finish migration. Blank legacy locations retain automatic mode. Placeholder labels such as `null` become an unselected configured location rather than a forecast for another city. Transient forecast failures retain the last successful reading and display a stale marker. Right-click requests a fresh forecast. The weather link credits Open-Meteo.

Process-icon sizing and the disabled manual Pywal integration remain outside this widget pass.

## Local relocation

The original patched checkout, including its upstream Git history, is preserved at `~/Library/Application Support/Übersicht/simple-bar.before-rift-bar`. Preferences before migration are backed up at `~/.simplebarrc.before-rift-bar`. The new repository has its own history and no upstream remote. Its first commit preserves the working patched baseline before cleanup.
