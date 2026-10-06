#!/bin/sh
# Configuration reads and saves run in Node (config-file.mjs); this only resolves the runtime.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$script_dir/node.sh" "$script_dir/config-file.mjs" "$@"
