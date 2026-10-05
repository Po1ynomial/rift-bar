#!/bin/sh
# Write stdin beside the destination, then replace it atomically. Follow existing
# dotfile symlinks so a save does not replace the user's link with a regular file.
set -eu
umask 077
target=$HOME/.simplebarrc
links=0
while [ -L "$target" ]; do
  links=$((links + 1))
  [ "$links" -le 40 ] || { printf '%s\n' 'Preferences symlink loop' >&2; exit 1; }
  link=$(readlink "$target")
  case "$link" in
    /*) target=$link ;;
    *) target=$(dirname "$target")/$link ;;
  esac
done
[ ! -d "$target" ] || { printf '%s\n' 'Preferences path is a directory' >&2; exit 1; }
temporary=$(mktemp "$target.XXXXXX")
trap 'rm -f "$temporary"' 0
trap 'exit 1' HUP INT TERM
cat > "$temporary"
mv -f "$temporary" "$target"
