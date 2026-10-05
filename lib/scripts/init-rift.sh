#!/bin/sh
# Query each display's native Space, including its inactive virtual workspaces.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
rift_path=${1:-/opt/homebrew/bin/rift-cli}

fail() {
  printf '%s\n' riftError
  exit 0
}

command -v jq >/dev/null 2>&1 || fail
displays=$("$rift_path" query displays 2>/dev/null) || fail
rows=$(printf '%s' "$displays" | jq -er '.[] | select(.space != null) | [.uuid, .space, .screen_id] | @tsv') || fail
spaces='[]'
index=0
while read -r uuid space_id screen_id; do
  index=$((index + 1))
  workspaces=$("$rift_path" query workspaces --space-id "$space_id" 2>/dev/null) || fail
  spaces=$(printf '%s' "$workspaces" | jq -ce \
    --argjson previous "$spaces" --arg uuid "$uuid" --argjson monitor "$index" '
    $previous + map({
      workspace: ($uuid + ":" + (.index | tostring)),
      name: .name,
      index: .index,
      displayUuid: $uuid,
      focused: .is_active,
      monitor: $monitor,
      windows: [.windows[] | {
        "app-name": .app_name,
        "window-title": (.title // ""),
        "window-id": .id,
        focused: .is_focused
      }]
    })') || fail
done <<EOF
$rows
EOF

printf '%s' "$displays" | jq -ce --argjson spaces "$spaces" '{
  displays: ([.[] | select(.space != null)] | to_entries | map(
    .value + {id: .value.screen_id, index: (.key + 1)}
  )),
  spaces: $spaces,
  SIP: "System Integrity Protection status: enabled.",
  shadow: "on"
}' || fail
