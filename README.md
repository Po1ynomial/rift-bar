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

Bar preferences remain in `~/.simplebarrc`. Click the bar and press `cmd + ,` to open its settings. The Rift CLI path defaults to `/opt/homebrew/bin/rift-cli`.

Add this hook to `~/.config/rift/config.toml` to restore subscriptions after Rift restarts:

```toml
[settings]
run_on_start = ["/bin/sh \"$HOME/projects/rift-bar/lib/scripts/subscribe-rift.sh\" '/opt/homebrew/bin/rift-cli' --refresh"]
```

Window gaps are configured separately in Rift. Relocating the bar does not change them.

## Refresh and workspace behavior

`lib/scripts/init-rift.sh` queries each display's current native Space, including all its virtual workspaces and windows. Rift screen IDs match Übersicht screen IDs. Clicking a workspace focuses its display before switching the zero-based workspace index. Window clicks use the full Rift window ID.

`lib/scripts/subscribe-rift.sh` registers `workspace_changed`, `windows_changed`, `focused_window_changed`, and `window_title_changed` once per widget instance. Identical subscriptions are deduplicated by Rift; the script does not remove other integrations' subscriptions. Events send `WIDGET_WANTS_REFRESH` through Übersicht's bundled Node runtime and WebSocket library. Workspace snapshots do not poll while idle.

Native macOS Space creation/deletion is not implemented. Only each display's current native Space is queried.

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

The original patched checkout, including its upstream Git history, is preserved at `~/Library/Application Support/Übersicht/simple-bar.before-rift-bar`. The new repository has its own history and no upstream remote. Its first commit preserves the working patched baseline before cleanup.
