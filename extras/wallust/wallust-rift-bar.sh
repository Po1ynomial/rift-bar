#!/bin/sh
# Generate rift-bar wallpaper palettes with wallust.
#
#   wallust-rift-bar.sh IMAGE              dark and light palettes from IMAGE
#   wallust-rift-bar.sh DARK_IMAGE LIGHT_IMAGE
#                                          each palette from its own image
#
# Both variants write beside the rift-bar TOML configuration; the bar applies
# them on its next configuration reload (save or cmd + r). See docs/wallust.md.
set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
case $# in
  1) dark=$1 light=$1 ;;
  2) dark=$1 light=$2 ;;
  *)
    printf '%s\n' 'Usage: wallust-rift-bar.sh IMAGE | DARK_IMAGE LIGHT_IMAGE' >&2
    exit 1
    ;;
esac
for image in "$dark" "$light"; do
  [ -f "$image" ] || { printf '%s\n' "Not a file: $image" >&2; exit 1; }
done
wallust run -s -q -d "$script_dir/dark" "$dark"
wallust run -s -q -d "$script_dir/light" "$light"
