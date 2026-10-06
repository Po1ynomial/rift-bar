#!/bin/sh
# Rift appends event JSON as an argument. No event data is evaluated here.
# Use Übersicht's bundled runtime for a fast, dependency-free soft refresh.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
script=$script_dir/notify-rift.mjs
. "$script_dir/node.sh" "$@"
