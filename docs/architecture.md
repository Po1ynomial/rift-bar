# Architecture

How rift-bar is put together. Reader-facing behavior lives in the README; this documents the machinery.

## Project layout

- `index.jsx` initializes preferences and styles, renders the bar, and runs Rift's event-driven snapshot command.
- `lib/rift.js` handles Rift subscriptions, snapshots, and workspace/window clicks.
- `lib/snapshot.js` validates normalized snapshots without changing their strings; `lib/snapshot-build.js` builds them from `rift-cli` output.
- `lib/config.js` defines defaults, typed fields, TOML parsing, sparse overrides, validation, and GUI bindings.
- `lib/settings.js` owns loaded configuration state and cross-display reload notifications.
- `lib/palette.js` validates wallust palette files and feeds theme colors to `lib/styles/theme.js`.
- `lib/scripts/config-file.mjs` resolves the XDG path and performs read-only loads and conflict-checked atomic saves, launched through `config-file.sh`.
- `lib/components/rift-bar-context.jsx` and `lib/components/workspaces/` render snapshots without backend selection or background workspace queries.
- `lib/components/icons/` is a consumer-independent icon catalog: stable identifiers, lazy SVG assets, and one `Icon` component that resolves names with a default fallback. `lib/app-icons.js` maps application names to catalog identifiers.
- `lib/widgets/` defines widget resources and data collectors. `lib/hooks/use-widget.js` connects their snapshots to React.
- `lib/components/data/` renders the retained widgets and handles user actions. Collectors do not own loading flags or polling timers.
- `tools/config-reference.mjs` generates `lib/schemas/config.json` and the configuration field reference from the same field definitions used by the GUI.

## Refresh and workspace behavior

`lib/scripts/init-rift.mjs` queries each display's current native Space, including all its virtual workspaces and windows. It runs on Übersicht's bundled Node runtime (falling back to `node` on `PATH`, overridable with `RIFT_BAR_NODE`) through the `init-rift.sh` launcher; snapshot collection has no shell or `jq` dependency. Rift screen IDs match Übersicht screen IDs. Clicking a workspace focuses its display before switching the zero-based workspace index. Window clicks use the full Rift window ID.

`lib/scripts/subscribe-rift.sh` registers `workspace_changed`, `windows_changed`, `focused_window_changed`, and `window_title_changed` once per widget instance. Concurrent refreshes share subscription setup. The script resolves its physical directory so every invocation registers the same callback path. Rift deduplicates them; the script does not remove other integrations' subscriptions. Events send `WIDGET_WANTS_REFRESH` through Übersicht's bundled Node runtime and WebSocket library. Workspace snapshots do not poll while idle.

Snapshots use ordinary JSON parsing with structural validation before rendering. Window titles and workspace names are not repaired or rewritten. A failed Rift query invalidates subscription setup so an error retry can register it again. Error-only retry timers stop when the error view unmounts or recovers. The startup hook documented in the README is still required after a restart that occurs entirely between queries, because there is no idle polling to detect it.

## Native macOS Spaces

Native macOS Space creation/deletion is not implemented, and cannot be: Rift's command protocol has no create or delete operation for native Spaces. Its `execute space` commands cover only adjacent-space switching and toggling whether Rift manages a Space. Only each display's current native Space is queried. Virtual workspace creation (`rift-cli execute workspace create`) works through Rift and is fully supported by the bar.
