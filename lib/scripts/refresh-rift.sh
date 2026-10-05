#!/bin/sh
# Rift appends event JSON as an argument. No event data is evaluated here.
# Use Übersicht's bundled runtime for a fast, dependency-free soft refresh.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
resources=/Applications/Übersicht.app/Contents/Resources
case $(uname -m) in
  arm64) runtime="$resources/node-arm64" ;;
  *) runtime="$resources/node-x64" ;;
esac
exec "$runtime" "$script_dir/notify-rift.mjs"
