# Configuration fields

Generated from `lib/config.js`. All fields are optional overrides. Omitted fields inherit builtin defaults. `Unset` means a theme-derived value or an unselected location, not a TOML value to write.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `appearance.theme` | `auto`, `dark`, `light` | `"auto"` | Appearance |
| `appearance.dark_theme` | `NightShiftDark`, `MacOSDark`, `OneDark`, `GruvboxDark`, `GruvboxMaterial`, `Dracula`, `Nord`, `Amarena`, `SolarizedDark`, `Cisco`, `Sylens`, `SpaceDuck`, `MidsummerNightDark`, `Catppuccin`, `CatppuccinFrappe`, `CatppuccinMacchiato`, `CatppuccinMocha`, `TokyoNight`, `MaterialOcean`, `NightOwl`, `NightfoxDark`, `VscodeDarkModern`, `RosePine`, `RosePineMoon`, `CyberdreamDark` | `"NightShiftDark"` | Dark theme |
| `appearance.light_theme` | `NightShiftLight`, `MacOSLight`, `OneLight`, `GruvboxLight`, `SolarizedLight`, `CatppuccinLatte`, `NightfoxLight`, `RosePineDawn`, `CyberdreamLight` | `"NightShiftLight"` | Light theme |
| `appearance.font` | string | `"JetBrains Mono, Monaco, Menlo, monospace"` | Font |
| `appearance.font_size` | string | `"11px"` | Font size |
| `appearance.animations` | boolean | `true` | Persistent animations |
| `appearance.text_scroll_speed` | number | `4` | Text scrolling speed |
| `bar.floating` | boolean | `false` | Floating bar |
| `bar.edge_padding` | string | `"5px"` | Distance from screen edges |
| `bar.background` | boolean | `true` | Bar background |
| `bar.foreground_height` | string | Unset | Foreground group height |
| `bar.padding` | string | Unset | Padding around button groups |
| `bar.radius` | string | Unset | Corner radius |
| `bar.shadow` | boolean | `true` | Bar shadow |
| `bar.colors.foreground` | string | Unset | Foreground |
| `bar.colors.background` | string | Unset | Background |
| `workspaces.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `workspaces.all_displays` | boolean | `false` | Include other displays' workspaces |
| `workspaces.show_empty` | boolean | `true` | Show empty workspaces |
| `workspaces.show_app_icons` | boolean | `true` | Show application icons |
| `workspaces.deduplicate_apps` | boolean | `false` | One icon per application |
| `workspaces.style.foreground` | string | Unset | Foreground |
| `workspaces.style.background` | string | Unset | Background |
| `workspaces.style.focused_foreground` | string | Unset | Focused foreground |
| `workspaces.style.focused_background` | string | Unset | Focused background |
| `workspaces.style.dark.foreground` | string | Unset | Foreground |
| `workspaces.style.dark.background` | string | Unset | Background |
| `workspaces.style.dark.focused_foreground` | string | Unset | Focused foreground |
| `workspaces.style.dark.focused_background` | string | Unset | Focused background |
| `workspaces.style.light.foreground` | string | Unset | Foreground |
| `workspaces.style.light.background` | string | Unset | Background |
| `workspaces.style.light.focused_foreground` | string | Unset | Focused foreground |
| `workspaces.style.light.focused_background` | string | Unset | Focused background |
| `process.mode` | `hidden`, `focused`, `all` | `"all"` | Windows to show |
| `process.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `process.centered` | boolean | `false` | Center window selectors |
| `process.show_titles` | boolean | `true` | Show window titles |
| `process.icons_only` | boolean | `false` | Icons only |
| `process.expand_all` | boolean | `false` | Expand every window label |
| `process.style.foreground` | string | Unset | Foreground |
| `process.style.background` | string | Unset | Background |
| `process.style.focused_foreground` | string | Unset | Focused foreground |
| `process.style.focused_background` | string | Unset | Focused background |
| `process.style.dark.foreground` | string | Unset | Foreground |
| `process.style.dark.background` | string | Unset | Background |
| `process.style.dark.focused_foreground` | string | Unset | Focused foreground |
| `process.style.dark.focused_background` | string | Unset | Focused background |
| `process.style.light.foreground` | string | Unset | Foreground |
| `process.style.light.background` | string | Unset | Background |
| `process.style.light.focused_foreground` | string | Unset | Focused foreground |
| `process.style.light.focused_background` | string | Unset | Focused background |
| `windows.exclude_apps` | array | `[]` | Excluded application names |
| `windows.exclude_titles` | array | `[]` | Excluded window titles |
| `widgets.clock.enabled` | boolean | `true` | Enabled |
| `widgets.clock.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.clock.show_icon` | boolean | `true` | Show icon |
| `widgets.clock.refresh_ms` | number | `1000` | Refresh interval, milliseconds |
| `widgets.clock.format` | `12h`, `24h` | `"24h"` | Clock format |
| `widgets.clock.show_seconds` | boolean | `false` | Show seconds |
| `widgets.clock.day_progress` | boolean | `true` | Day progress |
| `widgets.clock.style.foreground` | string | Unset | Foreground |
| `widgets.clock.style.background` | string | Unset | Background |
| `widgets.clock.style.dark.foreground` | string | Unset | Foreground |
| `widgets.clock.style.dark.background` | string | Unset | Background |
| `widgets.clock.style.light.foreground` | string | Unset | Foreground |
| `widgets.clock.style.light.background` | string | Unset | Background |
| `widgets.date.enabled` | boolean | `true` | Enabled |
| `widgets.date.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.date.show_icon` | boolean | `true` | Show icon |
| `widgets.date.refresh_ms` | number | `30000` | Refresh interval, milliseconds |
| `widgets.date.format` | `short`, `long` | `"short"` | Date format |
| `widgets.date.locale` | string | `"en-GB"` | Locale |
| `widgets.date.calendar_app` | string | `""` | Calendar application |
| `widgets.date.style.foreground` | string | Unset | Foreground |
| `widgets.date.style.background` | string | Unset | Background |
| `widgets.date.style.dark.foreground` | string | Unset | Foreground |
| `widgets.date.style.dark.background` | string | Unset | Background |
| `widgets.date.style.light.foreground` | string | Unset | Foreground |
| `widgets.date.style.light.background` | string | Unset | Background |
| `widgets.battery.enabled` | boolean | `true` | Enabled |
| `widgets.battery.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.battery.show_icon` | boolean | `true` | Show icon |
| `widgets.battery.refresh_ms` | number | `10000` | Refresh interval, milliseconds |
| `widgets.battery.toggle_caffeinate` | boolean | `true` | Toggle caffeinate on click |
| `widgets.battery.caffeinate_scope` | `system`, `display`, `both` | `"system"` | Prevent sleeping |
| `widgets.battery.caffeinate_timeout_seconds` | integer | `0` | Caffeinate timeout, seconds; zero means none |
| `widgets.battery.highlight_caffeinate` | boolean | `true` | Highlight caffeinate |
| `widgets.battery.style.foreground` | string | Unset | Foreground |
| `widgets.battery.style.background` | string | Unset | Background |
| `widgets.battery.style.dark.foreground` | string | Unset | Foreground |
| `widgets.battery.style.dark.background` | string | Unset | Background |
| `widgets.battery.style.light.foreground` | string | Unset | Foreground |
| `widgets.battery.style.light.background` | string | Unset | Background |
| `widgets.wifi.enabled` | boolean | `true` | Enabled |
| `widgets.wifi.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.wifi.show_icon` | boolean | `true` | Show icon |
| `widgets.wifi.refresh_ms` | number | `20000` | Refresh interval, milliseconds |
| `widgets.wifi.device` | string | `"en0"` | Network device |
| `widgets.wifi.hide_when_disabled` | boolean | `false` | Hide when disconnected |
| `widgets.wifi.show_name` | boolean | `true` | Show network name |
| `widgets.wifi.toggle_on_click` | boolean | `false` | Toggle Wi-Fi on click |
| `widgets.wifi.style.foreground` | string | Unset | Foreground |
| `widgets.wifi.style.background` | string | Unset | Background |
| `widgets.wifi.style.dark.foreground` | string | Unset | Foreground |
| `widgets.wifi.style.dark.background` | string | Unset | Background |
| `widgets.wifi.style.light.foreground` | string | Unset | Foreground |
| `widgets.wifi.style.light.background` | string | Unset | Background |
| `widgets.volume.enabled` | boolean | `true` | Enabled |
| `widgets.volume.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.volume.show_icon` | boolean | `true` | Show icon |
| `widgets.volume.refresh_ms` | number | `20000` | Refresh interval, milliseconds |
| `widgets.volume.style.foreground` | string | Unset | Foreground |
| `widgets.volume.style.background` | string | Unset | Background |
| `widgets.volume.style.dark.foreground` | string | Unset | Foreground |
| `widgets.volume.style.dark.background` | string | Unset | Background |
| `widgets.volume.style.light.foreground` | string | Unset | Foreground |
| `widgets.volume.style.light.background` | string | Unset | Background |
| `widgets.microphone.enabled` | boolean | `false` | Enabled |
| `widgets.microphone.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.microphone.show_icon` | boolean | `true` | Show icon |
| `widgets.microphone.refresh_ms` | number | `20000` | Refresh interval, milliseconds |
| `widgets.microphone.style.foreground` | string | Unset | Foreground |
| `widgets.microphone.style.background` | string | Unset | Background |
| `widgets.microphone.style.dark.foreground` | string | Unset | Foreground |
| `widgets.microphone.style.dark.background` | string | Unset | Background |
| `widgets.microphone.style.light.foreground` | string | Unset | Foreground |
| `widgets.microphone.style.light.background` | string | Unset | Background |
| `widgets.keyboard.enabled` | boolean | `false` | Enabled |
| `widgets.keyboard.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.keyboard.show_icon` | boolean | `true` | Show icon |
| `widgets.keyboard.refresh_ms` | number | `20000` | Refresh interval, milliseconds |
| `widgets.keyboard.max_characters` | integer | `0` | Maximum characters; zero means unlimited |
| `widgets.keyboard.style.foreground` | string | Unset | Foreground |
| `widgets.keyboard.style.background` | string | Unset | Background |
| `widgets.keyboard.style.dark.foreground` | string | Unset | Foreground |
| `widgets.keyboard.style.dark.background` | string | Unset | Background |
| `widgets.keyboard.style.light.foreground` | string | Unset | Foreground |
| `widgets.keyboard.style.light.background` | string | Unset | Background |
| `widgets.cpu.enabled` | boolean | `false` | Enabled |
| `widgets.cpu.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.cpu.show_icon` | boolean | `true` | Show icon |
| `widgets.cpu.refresh_ms` | number | `2000` | Refresh interval, milliseconds |
| `widgets.cpu.display` | `number`, `graph` | `"number"` | Display |
| `widgets.cpu.hide_below_percent` | number | `0` | Hide below percent |
| `widgets.cpu.monitor_app` | `activity_monitor`, `top`, `none` | `"activity_monitor"` | Monitor application |
| `widgets.cpu.style.foreground` | string | Unset | Foreground |
| `widgets.cpu.style.background` | string | Unset | Background |
| `widgets.cpu.style.dark.foreground` | string | Unset | Foreground |
| `widgets.cpu.style.dark.background` | string | Unset | Background |
| `widgets.cpu.style.light.foreground` | string | Unset | Foreground |
| `widgets.cpu.style.light.background` | string | Unset | Background |
| `widgets.memory.enabled` | boolean | `false` | Enabled |
| `widgets.memory.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.memory.show_icon` | boolean | `true` | Show icon |
| `widgets.memory.refresh_ms` | number | `4000` | Refresh interval, milliseconds |
| `widgets.memory.hide_below_percent` | number | `0` | Hide below percent |
| `widgets.memory.monitor_app` | `activity_monitor`, `top`, `none` | `"activity_monitor"` | Monitor application |
| `widgets.memory.style.foreground` | string | Unset | Foreground |
| `widgets.memory.style.background` | string | Unset | Background |
| `widgets.memory.style.dark.foreground` | string | Unset | Foreground |
| `widgets.memory.style.dark.background` | string | Unset | Background |
| `widgets.memory.style.light.foreground` | string | Unset | Foreground |
| `widgets.memory.style.light.background` | string | Unset | Background |
| `widgets.network_stats.enabled` | boolean | `false` | Enabled |
| `widgets.network_stats.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.network_stats.show_icon` | boolean | `true` | Show icon |
| `widgets.network_stats.refresh_ms` | number | `2000` | Refresh interval, milliseconds |
| `widgets.network_stats.display` | `number`, `graph` | `"number"` | Display |
| `widgets.network_stats.hide_below_kib_per_second` | number | `0` | Hide below KiB/s |
| `widgets.network_stats.style.foreground` | string | Unset | Foreground |
| `widgets.network_stats.style.background` | string | Unset | Background |
| `widgets.network_stats.style.dark.foreground` | string | Unset | Foreground |
| `widgets.network_stats.style.dark.background` | string | Unset | Background |
| `widgets.network_stats.style.light.foreground` | string | Unset | Foreground |
| `widgets.network_stats.style.light.background` | string | Unset | Background |
| `widgets.notifications.enabled` | boolean | `false` | Enabled |
| `widgets.notifications.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.notifications.refresh_ms` | number | `10000` | Refresh interval, milliseconds |
| `widgets.notifications.exclude_apps` | array | `[]` | Excluded application names |
| `widgets.notifications.style.foreground` | string | Unset | Foreground |
| `widgets.notifications.style.background` | string | Unset | Background |
| `widgets.notifications.style.dark.foreground` | string | Unset | Foreground |
| `widgets.notifications.style.dark.background` | string | Unset | Background |
| `widgets.notifications.style.light.foreground` | string | Unset | Foreground |
| `widgets.notifications.style.light.background` | string | Unset | Background |
| `widgets.weather.enabled` | boolean | `false` | Enabled |
| `widgets.weather.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.weather.show_icon` | boolean | `true` | Show icon |
| `widgets.weather.refresh_ms` | number | `1800000` | Refresh interval, milliseconds |
| `widgets.weather.location_mode` | `auto`, `configured` | `"auto"` | Location mode |
| `widgets.weather.unit` | `C`, `F` | `"C"` | Temperature unit |
| `widgets.weather.show_location` | boolean | `true` | Show location |
| `widgets.weather.show_gradient` | boolean | `true` | Show sunrise/sunset gradient |
| `widgets.weather.location.label` | string | `""` | Location label |
| `widgets.weather.location.latitude` | number | Unset | Latitude |
| `widgets.weather.location.longitude` | number | Unset | Longitude |
| `widgets.weather.style.foreground` | string | Unset | Foreground |
| `widgets.weather.style.background` | string | Unset | Background |
| `widgets.weather.style.dark.foreground` | string | Unset | Foreground |
| `widgets.weather.style.dark.background` | string | Unset | Background |
| `widgets.weather.style.light.foreground` | string | Unset | Foreground |
| `widgets.weather.style.light.background` | string | Unset | Background |
| `widgets.github.enabled` | boolean | `false` | Enabled |
| `widgets.github.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.github.show_icon` | boolean | `true` | Show icon |
| `widgets.github.refresh_ms` | number | `600000` | Refresh interval, milliseconds |
| `widgets.github.hide_when_empty` | boolean | `false` | Hide without notifications |
| `widgets.github.url` | string | `"https://github.com/notifications"` | Notifications URL |
| `widgets.github.cli_path` | string | `"/opt/homebrew/bin/gh"` | GitHub CLI path |
| `widgets.github.style.foreground` | string | Unset | Foreground |
| `widgets.github.style.background` | string | Unset | Background |
| `widgets.github.style.dark.foreground` | string | Unset | Foreground |
| `widgets.github.style.dark.background` | string | Unset | Background |
| `widgets.github.style.light.foreground` | string | Unset | Foreground |
| `widgets.github.style.light.background` | string | Unset | Background |
| `widgets.zoom.enabled` | boolean | `false` | Enabled |
| `widgets.zoom.displays` | array | `[]` | Show on displays, UUIDs; empty means all |
| `widgets.zoom.refresh_ms` | number | `5000` | Refresh interval, milliseconds |
| `widgets.zoom.show_microphone` | boolean | `true` | Show microphone |
| `widgets.zoom.show_video` | boolean | `true` | Show video |
| `widgets.zoom.style.foreground` | string | Unset | Foreground |
| `widgets.zoom.style.background` | string | Unset | Background |
| `widgets.zoom.style.dark.foreground` | string | Unset | Foreground |
| `widgets.zoom.style.dark.background` | string | Unset | Background |
| `widgets.zoom.style.light.foreground` | string | Unset | Foreground |
| `widgets.zoom.style.light.background` | string | Unset | Background |
| `rift.cli_path` | string | `"/opt/homebrew/bin/rift-cli"` | Rift CLI path |
| `interaction.terminal` | `terminal`, `iterm2` | `"terminal"` | Terminal for top |
| `interaction.notifications` | `system`, `bar`, `off` | `"system"` | Action feedback |
| `interaction.click_effect` | boolean | `true` | Click effect |
