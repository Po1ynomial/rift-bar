#!/bin/sh
# Resolve a Node runtime and exec the remaining arguments with it.
# Sourced by the sibling launchers: . node.sh SCRIPT.mjs [ARGS...]
# Preference: explicit override, Übersicht's bundled runtime, then PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -n "${RIFT_BAR_NODE-}" ]; then
  runtime=$RIFT_BAR_NODE
else
  resources=/Applications/Übersicht.app/Contents/Resources
  case $(uname -m) in
    arm64) runtime="$resources/node-arm64" ;;
    *) runtime="$resources/node-x64" ;;
  esac
  [ -x "$runtime" ] || runtime=$(command -v node || true)
fi
if [ -z "$runtime" ] || [ ! -x "$runtime" ]; then
  printf '%s\n' 'Cannot find a Node runtime (tried RIFT_BAR_NODE, Übersicht bundle, PATH)' >&2
  exit 1
fi
exec "$runtime" "$@"
