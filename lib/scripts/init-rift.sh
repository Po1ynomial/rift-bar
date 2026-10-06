#!/bin/sh
# Snapshot collection runs in Node (init-rift.mjs); this only resolves the runtime.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$script_dir/node.sh" "$script_dir/init-rift.mjs" "$@"
