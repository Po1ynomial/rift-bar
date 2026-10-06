#!/bin/sh
# Resolve a Node runtime and exec $script with the caller's arguments.
# Sourced by the sibling launchers, which set script first:
#   script=$script_dir/config-file.mjs; . "$script_dir/node.sh" "$@"
# The path travels in a variable because some /bin/sh implementations (dash)
# ignore arguments to the dot command and would expose only the caller's $@.
# Runtime preference: explicit override, Übersicht's bundled runtime, then PATH.
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
exec "$runtime" "$script" "$@"
