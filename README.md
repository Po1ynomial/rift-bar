# rift-bar

A [Rift](https://github.com/acsandmann/rift) status bar for [Übersicht](https://github.com/felixhageloh/uebersicht): workspaces and windows for every display, plus clock, battery, Wi-Fi, volume, CPU, memory, network stats, weather, and more.

rift-bar is derived from [Jean Tinland's simple-bar](https://github.com/Jean-Tinland/simple-bar) at revision `fb5cada`, ported from yabai/AeroSpace to Rift and independently maintained since. Upstream's MIT license and copyright are retained in `LICENSE`.

## Requirements

- macOS with Rift and `rift-cli` (tested with Rift 0.6.2)
- [Übersicht](https://github.com/felixhageloh/uebersicht) at `/Applications/Übersicht.app`
- No other dependencies; scripts run on Übersicht's bundled Node runtime

## Installation

Clone the repository into your Übersicht widgets directory:

```sh
git clone https://github.com/Po1ynomial/rift-bar "$HOME/Library/Application Support/Übersicht/widgets/rift-bar"
```

The clone directory must be named `rift-bar`. Übersicht compiles and watches the widget in place, and widget command paths, CSS classes, and the message-bus widget ID are derived from that name.

Add this hook to `~/.config/rift/config.toml` so the bar survives Rift restarts. Use the same CLI path as the bar's preferences:

```toml
[settings]
run_on_start = ["/bin/sh \"$HOME/Library/Application Support/Übersicht/widgets/rift-bar/lib/scripts/subscribe-rift.sh\" '/opt/homebrew/bin/rift-cli' --refresh"]
```

Window gaps are configured in Rift itself; account for the bar's height when sizing them.

## Usage

Click a workspace to switch to it; click a window to focus it. The bar reacts to Rift events immediately and does not poll while idle.

- `cmd + ,` — open settings
- `cmd + r` — reload configuration
- `cmd + t` — toggle dark/light appearance

Configuration lives in `$XDG_CONFIG_HOME/rift-bar/config.toml` as a sparse override of builtin defaults; missing files mean defaults with nothing to install or migrate. See the [configuration guide](docs/config.md) and the [field reference](docs/config-fields.md).

Widgets: clock, date, battery with caffeinate toggle, Wi-Fi, output and input volume, keyboard layout, CPU, memory, network statistics, Dock notification badges, weather, GitHub, and Zoom. See [docs/widgets.md](docs/widgets.md) for behavior and dependencies.

Themes: 34 builtins plus `WallustDark`/`WallustLight`, which color the bar from your wallpaper via [wallust](https://codeberg.org/explosion-mental/wallust) palettes. See [docs/wallust.md](docs/wallust.md).

## Documentation

- [Configuration](docs/config.md) and the [field reference](docs/config-fields.md)
- [Widgets](docs/widgets.md) — behavior, protocol, weather
- [Wallpaper themes](docs/wallust.md)
- [Architecture](docs/architecture.md) — layout, snapshot pipeline, native Spaces
- [Development](docs/development.md) — tests, CI, tooling ([tooling notes](docs/tooling.md))

## Development

```sh
pnpm install --frozen-lockfile
pnpm run --reporter=silent check
```

See [docs/development.md](docs/development.md) for the test suites, CI, and regeneration commands.

## License

MIT. See [LICENSE](LICENSE) for the full text, including upstream's copyright.
