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

Bar preferences remain in `~/.simplebarrc`. Click the bar and press `cmd + ,` to open its settings. The Rift CLI path defaults to `/opt/homebrew/bin/rift-cli`. Existing preferences are migrated on load: obsolete backend/server options are removed, while fonts, themes, data widgets, custom widgets, and CSS are retained. The saved `$schema` points to this project's schema served by Übersicht, not upstream's schema.

Add this hook to `~/.config/rift/config.toml` to restore subscriptions after Rift restarts:

```toml
[settings]
run_on_start = ["/bin/sh \"$HOME/projects/rift-bar/lib/scripts/subscribe-rift.sh\" '/opt/homebrew/bin/rift-cli' --refresh"]
```

Window gaps are configured separately in Rift. Relocating the bar does not change them.

## Refresh and workspace behavior

`lib/scripts/init-rift.sh` queries each display's current native Space, including all its virtual workspaces and windows. Rift screen IDs match Übersicht screen IDs. Clicking a workspace focuses its display before switching the zero-based workspace index. Window clicks use the full Rift window ID.

`lib/scripts/subscribe-rift.sh` registers `workspace_changed`, `windows_changed`, `focused_window_changed`, and `window_title_changed` once per widget instance. It resolves its physical directory so invocation from the source path or widget symlink registers identical callbacks. Rift deduplicates them; the script does not remove other integrations' subscriptions. Events send `WIDGET_WANTS_REFRESH` through Übersicht's bundled Node runtime and WebSocket library. Workspace snapshots do not poll while idle.

Native macOS Space creation/deletion is not implemented. Only each display's current native Space is queried.

## Project layout

- `index.jsx` renders the bar and runs Rift's event-driven snapshot command.
- `lib/rift.js` handles Rift subscriptions, snapshots, and workspace/window clicks.
- `lib/components/workspace-context.jsx` and `lib/components/workspaces/` render snapshots without backend selection or background workspace queries.
- `lib/components/data/` contains the retained data widgets. They keep their normal refresh intervals; the optional simple-bar-server connection has been removed.
- `lib/settings.js` and `lib/schemas/config.json` define the supported settings and preference migration.
- `tests/` covers Rift commands, symlink subscription identity, preference migration, data refresh retention, and the Wi-Fi/font fixes.

The yabai/AeroSpace backends, native-Space controls, backend chooser, and server hooks are removed. Shared CSS and storage names still use `simple-bar` to preserve existing preferences and custom styles. Links in the settings UI refer only to the original documentation for shared widget/theme options, not Rift behavior.

## Development

```sh
npm ci
npm test
npm run lint
```

Unit tests mock Rift responses and commands. They do not change the running window manager.

The optional live latency regression switches workspaces briefly, restores the original workspace and focused window, and checks that updates stay below 250ms with no idle snapshot polling. It requires `agent-browser` and should run while the desktop is otherwise idle:

```sh
npm run test:latency
```

## Local relocation

The original patched checkout, including its upstream Git history, is preserved at `~/Library/Application Support/Übersicht/simple-bar.before-rift-bar`. Preferences before migration are backed up at `~/.simplebarrc.before-rift-bar`. The new repository has its own history and no upstream remote. Its first commit preserves the working patched baseline before cleanup.
