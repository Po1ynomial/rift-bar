import { defineWidget, WidgetUnavailable } from "./runtime.js";

export function validCoordinates(location) {
  return (
    typeof location?.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    Math.abs(location.latitude) <= 90 &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.longitude) <= 180
  );
}

const placeholder = (name) => !name?.trim() || /^(null|undefined|none)$/i.test(name.trim());

async function json(url, signal, fetcher) {
  const response = await fetcher(url, { signal });
  if (!response.ok) throw new Error(`Weather service returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new TypeError("Invalid weather service response");
  if (data.error) throw new Error(data.reason || "Weather service rejected the request");
  return data;
}

export async function searchLocations(name, { signal, fetcher = globalThis.fetch } = {}) {
  if (typeof name !== "string" || placeholder(name) || name.trim().length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: name.trim(),
    count: "10",
    language: "en",
    format: "json",
  });
  const data = await json(url, signal, fetcher);
  if (data.results !== undefined && !Array.isArray(data.results))
    throw new TypeError("Invalid location search response");
  return (data.results || [])
    .filter((item) => validCoordinates(item) && typeof item.name === "string")
    .map((item) => ({
      label: [...new Set([item.name, item.admin1, item.country].filter(Boolean))].join(", "),
      latitude: item.latitude,
      longitude: item.longitude,
    }));
}

export function getPosition({ signal, geolocation, timers = globalThis, timeoutMs = 5000 } = {}) {
  // Übersicht's compiler puts optional-chain temporaries in the function body.
  // Resolve this default here, not in the separate parameter scope.
  const geo = geolocation === undefined ? globalThis.navigator?.geolocation : geolocation;
  return new Promise((resolve, reject) => {
    if (!geo)
      return reject(
        new WidgetUnavailable("Geolocation is unavailable. Select a weather location in settings."),
      );
    let timer,
      finished = false;
    const finish = (fn, value) => {
      if (finished) return;
      finished = true;
      timers.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      fn(value);
    };
    const abort = () =>
      finish(reject, new DOMException("Location request cancelled", "AbortError"));
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    timer = timers.setTimeout(
      () =>
        finish(
          reject,
          new WidgetUnavailable("Location timed out. Select a weather location in settings."),
        ),
      timeoutMs,
    );
    try {
      geo.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
            label: "Local",
          };
          if (!validCoordinates(location))
            return finish(reject, new WidgetUnavailable("Invalid coordinates from geolocation."));
          finish(resolve, location);
        },
        (error) =>
          finish(
            reject,
            new WidgetUnavailable(
              error.code === 1
                ? "Location permission denied. Select a weather location in settings."
                : "Cannot determine your location. Select a weather location in settings.",
            ),
          ),
        { timeout: timeoutMs, maximumAge: 300000 },
      );
    } catch (error) {
      finish(reject, error);
    }
  });
}

export async function loadWeather(
  config,
  { signal, fetcher = globalThis.fetch, geolocation } = {},
) {
  let location;
  if (config.location_mode === "auto") {
    location = await getPosition({ signal, geolocation });
  } else if (config.location_mode === "configured") {
    location = config.location;
    if (!validCoordinates(location))
      throw new WidgetUnavailable("Select a weather location or enter coordinates in settings.");
  } else {
    throw new WidgetUnavailable("Choose automatic or configured weather location in settings.");
  }
  if (signal?.aborted) throw new DOMException("Weather request cancelled", "AbortError");
  if (!["C", "F"].includes(config.unit)) throw new TypeError("Invalid weather temperature unit");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,weather_code,is_day",
    daily: "sunrise,sunset",
    temperature_unit: config.unit === "F" ? "fahrenheit" : "celsius",
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "1",
  });
  const data = await json(url, signal, fetcher);
  const current = data.current;
  if (
    typeof current?.temperature_2m !== "number" ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isInteger(current.weather_code) ||
    ![0, 1].includes(current.is_day) ||
    !Number.isFinite(current.time)
  )
    throw new TypeError("Invalid weather forecast response");
  const sunrise = data.daily?.sunrise?.[0];
  const sunset = data.daily?.sunset?.[0];
  // Polar regions may not have a sunrise or sunset on this date.
  return {
    location: location.label || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`,
    latitude: location.latitude,
    longitude: location.longitude,
    temperature: current.temperature_2m,
    unit: config.unit,
    code: current.weather_code,
    isDay: current.is_day === 1,
    observedAt: current.time * 1000,
    sunrise: Number.isFinite(sunrise) ? sunrise * 1000 : undefined,
    sunset: Number.isFinite(sunset) ? sunset * 1000 : undefined,
  };
}

export function weatherIcon(code, isDay) {
  if (code >= 95) return "Storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([45, 48].includes(code)) return "Fog";
  if ([2, 3].includes(code)) return "Cloud";
  return isDay ? "Sun" : "Moon";
}

export const weather = defineWidget({
  id: "weather",
  refreshFrequency: 1800000,
  load: ({ config, signal }) => loadWeather(config, { signal }),
  validate: (data) =>
    validCoordinates(data) && Number.isFinite(data.temperature) && Number.isInteger(data.code),
});
