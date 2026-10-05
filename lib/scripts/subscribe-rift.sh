#!/bin/sh
# Rift deduplicates identical event/command/args subscriptions. Do not unsubscribe
# whole events here: that would remove other integrations' subscriptions too.
set -eu
rift_path=${1:-/opt/homebrew/bin/rift-cli}
# The startup hook and Übersicht symlink must register the same callback path.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)

for event in workspace_changed windows_changed focused_window_changed window_title_changed; do
  "$rift_path" subscribe cli --event "$event" --command /bin/sh \
    --args "$script_dir/refresh-rift.sh" >/dev/null
done

# Used by Rift's run_on_start hook to update an already running Übersicht.
if [ "${2-}" = --refresh ]; then
  /bin/sh "$script_dir/refresh-rift.sh"
fi
