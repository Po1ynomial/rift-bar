import * as Uebersicht from "uebersicht";
import * as Utils from "../utils.js";
import { defineWidget, WidgetUnavailable, widgetInterval } from "./runtime.js";
import { shellQuote } from "../rift.js";

async function command(config, fallback, value, force, signal) {
  if (signal?.aborted) throw new DOMException("Widget command cancelled", "AbortError");
  const output = await Utils.cachedRun(value, widgetInterval(config.refreshFrequency, fallback), { force });
  if (signal?.aborted) throw new DOMException("Widget command cancelled", "AbortError");
  return output;
}
const finite = (value) => typeof value === "number" && Number.isFinite(value);

export const time = defineWidget({
  id: "time", refreshFrequency: 1000,
  load: ({ config }) => ({ time: new Date().toLocaleString("en-UK", {
    hour: "numeric", minute: "numeric", second: config.showSeconds ? "numeric" : undefined, hour12: config.hour12,
  }) }),
  validate: (data) => typeof data?.time === "string",
});

export const date = defineWidget({
  id: "date", refreshFrequency: 30000,
  load: ({ config }) => {
    const format = config.shortDateFormat ? "short" : "long";
    const locale = config.locale?.length > 4 ? config.locale : "en-UK";
    return { now: new Date().toLocaleDateString(locale, { weekday: format, month: format, day: "numeric" }) };
  },
  validate: (data) => typeof data?.now === "string",
});

export const cpu = defineWidget({
  id: "cpu", refreshFrequency: 2000,
  load: async ({ config, force, signal }) => ({ usage: parseInt(await command(config, 2000,
    `top -l 2 | awk '/CPU usage/ && NR > 10 {gsub(/%/, "", $7); print int(100 - $7); exit}'`, force, signal), 10) }),
  validate: (data) => finite(data?.usage) && data.usage >= 0 && data.usage <= 100,
});

export const memory = defineWidget({
  id: "memory", refreshFrequency: 4000,
  load: async ({ config, force, signal }) => ({ free: parseInt(Utils.cleanupOutput(await command(config, 4000,
    'vm_stat | awk \'BEGIN {page_size=4096} /page size of/ {page_size=$8} /Pages free/ {free=$3} /Pages inactive/ {inactive=$3} /Pages speculative/ {spec=$4} /Pages active/ {active=$3} /Pages wired/ {wired=$4} END {gsub(/\\./, "", free); gsub(/\\./, "", inactive); gsub(/\\./, "", spec); gsub(/\\./, "", active); gsub(/\\./, "", wired); available=free+inactive+spec; total=available+active+wired; printf "%.0f", (available/total)*100}\'', force, signal)), 10) }),
  validate: (data) => finite(data?.free) && data.free >= 0 && data.free <= 100,
});

export const netstats = defineWidget({
  id: "netstats", refreshFrequency: 2000,
  load: async ({ config, force, signal }) => JSON.parse(Utils.cleanupOutput(await command(config, 2000,
    "bash ./simple-bar/lib/scripts/netstats.sh 2>&1", force, signal))),
  validate: (data) => finite(data?.download) && finite(data?.upload),
});

export const battery = defineWidget({
  id: "battery", refreshFrequency: 10000,
  load: async ({ config, force, signal }) => {
    const [system, percentage, status, caffeinate, lowPowerMode] = await Promise.all([
      Utils.getSystem(),
      command(config, 10000, `pmset -g batt | grep -Eo '[0-9]+%' | head -1 | tr -d '%'`, force, signal),
      command(config, 10000, `pmset -g batt | head -1 | grep -q 'AC Power' && echo 'AC' || echo 'Batt'`, force, signal),
      Uebersicht.run("pgrep caffeinate"),
      command(config, 10000, `pmset -g | awk '/lowpowermode|powermode/ {print $2; exit}'`, force, signal),
    ]);
    const charge = parseInt(percentage, 10);
    if (!finite(charge)) return null;
    return {
      system, percentage: charge, charging: Utils.cleanupOutput(status) === "AC",
      caffeinate: Utils.cleanupOutput(caffeinate), lowPowerMode: Utils.cleanupOutput(lowPowerMode) === "1",
    };
  },
  validate: (data) => data === null || finite(data?.percentage),
});

export const wifi = defineWidget({
  id: "wifi", refreshFrequency: 20000,
  load: async ({ config, force, signal }) => {
    const [status, ssid] = await Promise.all([
      command(config, 20000, `ifconfig ${shellQuote(config.networkDevice)} | grep status | cut -c 10-`, force, signal),
      command(config, 20000, `system_profiler SPAirPortDataType | awk '/Current Network/ {getline;$1=$1;print $0 | "tr -d ':'";exit}'`, force, signal),
    ]);
    return { status: Utils.cleanupOutput(status), ssid: Utils.cleanupOutput(ssid) };
  },
  validate: (data) => typeof data?.status === "string" && typeof data.ssid === "string",
});

export const keyboard = defineWidget({
  id: "keyboard", refreshFrequency: 20000,
  load: async ({ config, force, signal }) => {
    const layout = Utils.cleanupOutput(await command(config, 20000,
      `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | awk '/KeyboardLayout Name/ {$1=$2=$3=""; print $0}'`, force, signal)).replace(";", "").replaceAll('"', "");
    if (layout.length) return { keyboard: layout };
    const mode = Utils.cleanupOutput(await command(config, 20000,
      `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | awk '/"Input Mode" =/ {$1=$2=$3=""; print $0}'`, force, signal)).replace(/"com.apple.inputmethod.(.*)"/, "$1").replace(";", "");
    return mode.length ? { keyboard: mode.split(".").pop() } : null;
  },
  validate: (data) => data === null || typeof data?.keyboard === "string",
});

export const sound = defineWidget({
  id: "sound", refreshFrequency: 20000,
  load: async ({ config, force, signal }) => {
    const parts = Utils.cleanupOutput(await command(config, 20000,
      `osascript -e 'set v to get volume settings' -e 'output volume of v & "," & output muted of v'`, force, signal)).split(",");
    if (parts[0] === "missing value" || parts[1] === "missing value") return null;
    return { volume: parts[0], muted: parts[1] };
  },
  validate: (data) => data === null || (finite(Number(data?.volume)) && ["true", "false"].includes(data.muted)),
});

export const mic = defineWidget({
  id: "mic", refreshFrequency: 20000,
  load: async ({ config, force, signal }) => {
    const volume = Utils.cleanupOutput(await command(config, 20000,
      `osascript -e 'input volume of (get volume settings)'`, force, signal));
    return volume === "missing value" ? null : { volume };
  },
  validate: (data) => data === null || (data?.volume !== "" && finite(Number(data?.volume))),
});

export const github = defineWidget({
  id: "github", refreshFrequency: 600000,
  load: async ({ config, force, signal }) => {
    const path = shellQuote(config.ghBinaryPath);
    const present = await command(config, 600000, `if command -v ${path} >/dev/null 2>&1; then printf present; fi`, force, signal);
    if (present.trim() !== "present") throw new WidgetUnavailable("GitHub requires gh. Configure its binary path in settings.");
    const result = JSON.parse(await command(config, 600000, `${path} api notifications`, force, signal));
    if (!Array.isArray(result)) throw new TypeError("Invalid GitHub notification response");
    return { count: result.length > 99 ? "99+" : result.length };
  },
  validate: (data) => data?.count === "99+" || (Number.isInteger(data?.count) && data.count >= 0),
});

export const zoom = defineWidget({
  id: "zoom", refreshFrequency: 5000,
  load: async ({ config, force, signal }) => {
    const [mic, video] = await Promise.all([
      command(config, 5000, "osascript ./simple-bar/lib/scripts/zoom-mute-status.applescript", force, signal),
      command(config, 5000, "osascript ./simple-bar/lib/scripts/zoom-video-status.applescript", force, signal),
    ]);
    return { mic: Utils.cleanupOutput(mic), video: Utils.cleanupOutput(video) };
  },
  validate: (data) => ["", "on", "off"].includes(data?.mic) && ["", "on", "off"].includes(data?.video),
});
