# Configuration

The source of truth is `$XDG_CONFIG_HOME/rift-bar/config.toml`, or `~/.config/rift-bar/config.toml` when `XDG_CONFIG_HOME` is unset or empty. An explicit XDG path must be absolute. Übersicht's process environment determines this path.

There is no legacy preference loading, migration, or fallback. Custom widgets, arbitrary CSS, shell actions, and palette-variable overrides are not configuration features. Change the source for those features.

## Sparse overrides

Builtin defaults and field definitions live in `lib/config.js`. TOML supplies only explicit overrides. Tables merge recursively and arrays replace completely. Omitted fields inherit defaults, including defaults changed in a later source revision. Explicit values remain overrides even when they equal today's default. `false`, `0`, empty strings where permitted, and empty arrays are not treated as missing.

```toml
[appearance]
font_size = "13px"

[bar]
floating = true
background = false
foreground_height = "34px"
padding = "4px 8px"

[widgets.clock.style]
foreground = "white"
background = "#5865a8"

[widgets.weather]
enabled = true
location_mode = "configured"
show_gradient = false

[widgets.weather.location]
label = "Paris"
latitude = 48.85
longitude = 2.35
```

The [generated field reference](config-fields.md) lists every field, accepted enum value, and builtin default. `lib/schemas/config.json` is generated from the same definition for editor integration. Runtime validation also checks CSS values, locales, URLs, integer-only fields, and coordinate dependencies.

## GUI editing and saving

Click the bar and press `cmd + ,` to open settings. The GUI edits overrides while displaying effective values. Each field indicates whether it is inherited or explicit. Reset removes the override rather than storing the current default. Resetting the weather location removes the selected location and its configured-mode override together.

Startup reads the file without creating or rewriting it. A missing file uses defaults. The first explicit save creates the XDG directory and file. GUI saves serialize a consistently formatted sparse TOML document; comments and original formatting are not preserved. Empty tables are omitted.

Saving checks the file's byte-content revision captured when the editing session opened. Another GUI writer or an external edit causes a conflict instead of a silent overwrite. GUI writes are serialized with a directory lock, follow existing configuration symlinks, and replace the target atomically with a private temporary file. Failed writes leave the active settings unchanged.

On a conflict, the draft remains available. "Reload and keep edited fields" explicitly reapplies the edited fields to the newly loaded file while preserving untouched external fields. Where both edits changed the same field, the retained GUI edit wins after this explicit reload. "Discard edits" restores the loaded override document.

Successful saves and explicit reloads notify the other display instances to reread TOML. Browser storage holds only a disposable reload notification, never an authoritative settings copy. Without storage, event-driven snapshot refreshes also reload configuration directly. There is no idle configuration polling or automatic file watcher. Use the reload button or `cmd + r` after external edits.

Invalid configuration reports a field path, and a line when available. Syntax errors include TOML parser diagnostics. The running bar retains its last valid settings and shows an error. Invalid startup blocks normal startup instead of reporting defaults as a successful load. Saves are blocked until the file can be loaded again. Errors remain visible even when interaction notifications are disabled.

`cmd + t` toggles the bar's explicit dark/light appearance, saving only `appearance.theme`. It does not change macOS appearance. In automatic mode, the shortcut selects the opposite of the currently detected system appearance.

## Appearance and bar geometry

All 34 supplied themes are builtin. `appearance.dark_theme` and `appearance.light_theme` choose the active pair; `appearance.theme` chooses automatic, dark, or light appearance.

The bar is always at the top. Floating and background visibility are independent. `bar.edge_padding` is the distance from the screen edges while floating. `bar.padding` is clearance around the foreground button groups inside the outer bar, not padding inside each button. Padding is additive and never shrinks the foreground groups. `bar.foreground_height` controls the visible groups, including their internal padding, and defaults to the theme's normal height. The outer container derives its height from that foreground height plus vertical padding and any theme border. This geometry is unchanged when the backing surface is invisible. `bar.shadow` controls the outer bar's blurred shadow, not individual button shadows or the focus outline.

For example, a 34px foreground and `padding = "4px 8px"` occupy 42px vertically with the default borderless theme. Existing foreground-group padding leaves 26px buttons when the bar background is disabled. The floating inset is additional occupied desktop space; Rift's independently configured window gaps must accommodate the total. Settings open below the actual outer container, including its padding.

Dimensions accept nonnegative CSS lengths, with positive values required for font size and foreground height. Foreground height accepts pixel, font-relative, and viewport lengths, not percentages against an automatically sized parent. Padding accepts one to four nonnegative lengths. Button geometry and per-widget typography remain in source.

Colors apply to actual components rather than modifying the global theme palette. `[bar.colors]` sets the bar's own colors. Each `[widgets.NAME.style]` accepts `foreground` and `background`; `.style.dark` and `.style.light` optionally override these per appearance. Appearance-specific colors take precedence over base colors. These are literal CSS colors, not arbitrary CSS declarations. Weather's gradient remains controlled separately by `show_gradient`.

Workspace and process styles additionally accept `focused_foreground` and `focused_background`. Their normal colors do not replace the builtin focused colors unless the focused fields are also specified.

## Displays, workspaces, and windows

`displays` selects where a widget or section appears. The empty array means all displays. Values are Rift display UUIDs; the GUI shows display names or indexes and retains offline selections. This is independent of `workspaces.all_displays`, which includes other displays' workspaces in each visible workspace section.

Workspaces have no enable switch. `show_empty` hides empty inactive workspaces when false; the active workspace remains visible. `show_app_icons` controls application icons, and `deduplicate_apps` shows one icon per application within each workspace.

The process section shows window selectors for the active workspace on that display, not operating-system processes. `mode` chooses hidden, focused-only, or all windows in that workspace. `centered` centers the section horizontally. `show_titles` includes window titles, while `icons_only` suppresses all text. `expand_all` keeps nonfocused window labels expanded rather than collapsed to icons.

`windows.exclude_apps` and `windows.exclude_titles` are exact-match lists shared by workspace icons and window selectors. They change rendering, not Rift's window management. There is no regex filter API.

## Widget behavior

Widget enablement, display restrictions, icon visibility where applicable, refresh intervals, and the listed widget-specific preferences remain configurable. Refresh intervals must be at least 250ms. Collector commands, retry rules, cache policy, graph storage, and timeouts remain in source.

Configured weather requires a latitude/longitude pair. Search and select the intended city in the GUI, or enter coordinates directly. The search text is not itself a forecast location. Automatic mode uses browser geolocation and ignores the configured location. No location is guessed on permission failure.

Battery caffeinate settings use a fixed scope enum instead of arbitrary command flags. `system` prevents idle system sleep, `display` prevents display sleep, and `both` prevents both. A timeout of zero means no automatic timeout.

CPU and memory widgets can open Activity Monitor, run `top`, or do nothing. `interaction.terminal` selects Terminal or iTerm2 only for `top`; it does not select the collector shell.

`interaction.notifications` controls short action-feedback messages through macOS notifications, messages inside the bar, or no messages. It does not control the Dock badge widget named `widgets.notifications`. Configuration and save errors are always shown inline.
