#!/bin/sh
# The TOML file is authoritative. Reads never create directories or files.
set -eu
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
umask 077
config_home=${XDG_CONFIG_HOME:-$HOME/.config}
case "$config_home" in /*) ;; *) printf '%s\n' 'XDG_CONFIG_HOME must be absolute' >&2; exit 1 ;; esac
config_path=$config_home/rift-bar/config.toml
target=$config_path
links=0
while [ -L "$target" ]; do
  links=$((links + 1))
  [ "$links" -le 40 ] || { printf '%s\n' 'Configuration symlink loop' >&2; exit 1; }
  link=$(readlink "$target")
  case "$link" in
    /*) target=$link ;;
    *) target=$(dirname "$target")/$link ;;
  esac
done
[ ! -d "$target" ] || { printf '%s\n' 'Configuration path is a directory' >&2; exit 1; }

read_contents() {
  if [ -e "$target" ]; then
    # A sentinel preserves all trailing newlines through command substitution.
    contents=$(cat "$target" && printf '.')
    contents=${contents%.}
    revision=$(printf '%s' "$contents" | shasum -a 256)
    revision=${revision%% *}
  elif [ "$target" != "$config_path" ]; then
    printf '%s\n' 'Configuration symlink target does not exist' >&2
    exit 1
  else
    contents=
    revision=missing
  fi
}

case "${1-}" in
  read)
    read_contents
    jq -n --arg path "$config_path" --arg revision "$revision" --arg text "$contents" \
      '{path: $path, revision: $revision, text: $text}'
    ;;
  save)
    [ "$#" -eq 3 ] || { printf '%s\n' 'Expected configuration path and revision' >&2; exit 1; }
    [ "$2" = "$config_path" ] || { printf '%s\n' 'Configuration path changed; reload before saving' >&2; exit 1; }
    directory=$(dirname "$target")
    mkdir -p "$directory"
    lock=$directory/.rift-bar-config.lock
    mkdir "$lock" 2>/dev/null || { printf '%s\n' 'Another configuration save is in progress; retry' >&2; exit 1; }
    temporary=
    cleanup() {
      [ -z "$temporary" ] || rm -f "$temporary"
      rmdir "$lock"
    }
    trap cleanup 0
    trap 'exit 1' HUP INT TERM
    temporary=$(mktemp "$target.XXXXXX")
    cat > "$temporary"
    read_contents
    [ "$revision" = "$3" ] || { printf '%s\n' 'Configuration changed on disk; reload before saving' >&2; exit 1; }
    mv -f "$temporary" "$target"
    temporary=
    printf '%s\n' saved
    ;;
  *) printf '%s\n' 'Usage: config-file.sh read | save PATH REVISION' >&2; exit 1 ;;
esac
