# Wallpaper themes with wallust

rift-bar can color itself from your wallpaper using [wallust](https://codeberg.org/explosion-mental/wallust) palettes. Two builtin themes, `WallustDark` and `WallustLight`, appear in the appearance settings like any other theme. Without palette files they fall back to NightShift colors, so selecting them is always safe.

## Setup

Run the bundled helper with your wallpaper:

```sh
extras/wallust/wallust-rift-bar.sh ~/Pictures/wallpaper.png
```

This generates both a dark-targeted and a light-targeted palette from the image and writes them beside your configuration as `~/.config/rift-bar/wallust-dark.json` and `~/.config/rift-bar/wallust-light.json`. To color each appearance from its own image — for example the light and dark variants of a dual-theme wallpaper — pass both:

```sh
extras/wallust/wallust-rift-bar.sh dark-wallpaper.png light-wallpaper.png
```

Then select `WallustDark` as the dark theme, `WallustLight` as the light theme, or both, in settings (`cmd + ,`, Appearance). With `appearance.theme = "auto"` the bar follows macOS appearance and applies the matching palette automatically.

Reload the bar's configuration (`cmd + r` or any settings save) to apply a regenerated palette.

## How it works

The helper runs `wallust run` twice with its own template directories (`extras/wallust/dark` and `extras/wallust/light`), so it never touches your own wallust configuration. Wallust renders one JSON palette per appearance using its `dark` and `light` palette modes.

On every configuration read, rift-bar loads any palette files sitting beside `config.toml`. A palette must contain all required slots (`background`, `foreground`, and `color0`–`color15`) as six-digit hex colors; an invalid or partial file is ignored and the theme keeps its fallback colors. Only color slots come from the palette — bar geometry, borders, and fonts always come from the base theme.

## Notes

- wallust reads PNG and JPEG. For HEIC wallpapers (the macOS default format), convert first: `sips -s format png wallpaper.heic --out wallpaper.png`. Dynamic wallpapers pack several frames in one HEIC; extracting them needs `libheif` (`heif-convert`), after which you can pass the dark and light frames as two images.
- Palette regeneration is not automatic: rerun the helper when the wallpaper changes. Wire it into your wallpaper switcher if you want palettes to track wallpaper changes.
- `wallust cs`, `wallust theme`, and the pywal-compat mode also work; point any wallust template at `~/.config/rift-bar/wallust-dark.json` (or `-light`) using the variable names in `extras/wallust/dark/templates/rift-bar.json`.
