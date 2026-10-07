import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadWeather,
  getPosition,
  searchLocations,
  validCoordinates,
  weatherIcon,
} from "../lib/widgets/weather.js";

const config = {
  location_mode: "configured",
  location: { label: "Paris, France", latitude: 48.85, longitude: 2.35 },
  unit: "C",
};
const forecast = {
  current: { temperature_2m: 12.8, weather_code: 61, is_day: 1, time: 1700000000 },
  daily: { sunrise: [1699990000], sunset: [1700030000] },
};
const response = (data) => ({ ok: true, json: async () => data });

for (const location of [
  null,
  {},
  { latitude: null, longitude: null },
  { latitude: "null", longitude: 0 },
  { latitude: 91, longitude: 0 },
  { latitude: 0, longitude: 181 },
  { latitude: NaN, longitude: 0 },
]) {
  test(`invalid coordinates never reach a forecast endpoint: ${JSON.stringify(location)}`, async () => {
    let requests = 0;
    await assert.rejects(
      loadWeather(
        { ...config, location: location },
        {
          fetcher: async () => {
            requests++;
            return response(forecast);
          },
        },
      ),
      /location|coordinates/,
    );
    assert.equal(requests, 0);
  });
}

test("configured weather works without geolocation and preserves zero coordinates", async () => {
  const signal = new AbortController().signal;
  let request;
  const data = await loadWeather(
    { ...config, unit: "F", location: { latitude: 0, longitude: 0 } },
    {
      signal,
      geolocation: {
        getCurrentPosition: () => assert.fail("Must not request location permission"),
      },
      fetcher: async (url, options) => {
        request = { url, options };
        return response(forecast);
      },
    },
  );
  assert.equal(request.url.hostname, "api.open-meteo.com");
  assert.equal(request.url.searchParams.get("latitude"), "0");
  assert.equal(request.url.searchParams.get("longitude"), "0");
  assert.equal(request.url.searchParams.get("temperature_unit"), "fahrenheit");
  assert.equal(request.url.searchParams.get("timeformat"), "unixtime");
  assert.equal(request.options.signal, signal);
  assert.equal(data.temperature, 12.8);
  assert.equal(data.unit, "F");
  assert.equal(data.sunrise, 1699990000000);
});

test("standard geolocation coordinates drive automatic forecasts without an address", async () => {
  let url;
  const data = await loadWeather(
    { ...config, location_mode: "auto" },
    {
      geolocation: {
        getCurrentPosition: (resolve) => resolve({ coords: { latitude: 52.52, longitude: 13.41 } }),
      },
      fetcher: async (value) => {
        url = value;
        return response(forecast);
      },
    },
  );
  assert.equal(url.searchParams.get("latitude"), "52.52");
  assert.equal(url.searchParams.get("longitude"), "13.41");
  assert.equal(data.location, "Local");
});

for (const code of [1, 2, 3]) {
  test(`geolocation failure ${code} does not fetch or fall back to another city`, async () => {
    await assert.rejects(
      loadWeather(
        { ...config, location_mode: "auto" },
        {
          geolocation: { getCurrentPosition: (_resolve, reject) => reject({ code }) },
          fetcher: () => assert.fail("No forecast without coordinates"),
        },
      ),
      /permission|location/,
    );
  });
}

test("geolocation timeout is bounded and late callbacks are ignored", async () => {
  let callback,
    timeout,
    cleared = 0;
  const pending = getPosition({
    geolocation: {
      getCurrentPosition: (resolve) => {
        callback = resolve;
      },
    },
    timers: {
      setTimeout: (fn) => {
        timeout = fn;
        return 1;
      },
      clearTimeout: () => {
        cleared++;
      },
    },
  });
  timeout();
  await assert.rejects(pending, /timed out/);
  callback({ coords: { latitude: 1, longitude: 2 } });
  assert.equal(cleared, 1);
});

test("geolocation can be cancelled without fetching or retaining timers", async () => {
  const controller = new AbortController();
  let cleared = 0;
  const pending = getPosition({
    signal: controller.signal,
    geolocation: { getCurrentPosition: () => {} },
    timers: {
      setTimeout: () => 1,
      clearTimeout: () => {
        cleared++;
      },
    },
  });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(cleared, 1);
});

test("placeholder searches never resolve to unintended cities", async () => {
  for (const name of ["", "null", " Null ", "undefined", "none", "x"]) {
    assert.deepEqual(
      await searchLocations(name, { fetcher: () => assert.fail("Must not search") }),
      [],
    );
  }
});

test("city search returns all valid candidates for explicit selection", async () => {
  const locations = await searchLocations("Paris", {
    fetcher: async () =>
      response({
        results: [
          {
            name: "Paris",
            admin1: "Ile-de-France",
            country: "France",
            latitude: 48.85,
            longitude: 2.35,
          },
          {
            name: "Paris",
            admin1: "Texas",
            country: "United States",
            latitude: 33.66,
            longitude: -95.55,
          },
          { name: "Broken", latitude: null, longitude: 1 },
        ],
      }),
  });
  assert.equal(locations.length, 2);
  assert.equal(locations[0].label, "Paris, Ile-de-France, France");
  assert.equal(locations[1].label, "Paris, Texas, United States");
});

for (const bad of [
  null,
  {},
  { current: { ...forecast.current, temperature_2m: null } },
  { current: { ...forecast.current, is_day: null } },
]) {
  test(`invalid provider response is rejected: ${JSON.stringify(bad)}`, async () => {
    await assert.rejects(loadWeather(config, { fetcher: async () => response(bad) }));
  });
}

test("HTTP and provider errors are reported", async () => {
  await assert.rejects(
    loadWeather(config, { fetcher: async () => ({ ok: false, status: 429 }) }),
    /429/,
  );
  await assert.rejects(
    loadWeather(config, { fetcher: async () => response({ error: true, reason: "Bad request" }) }),
    /Bad request/,
  );
});

test("polar forecasts may omit sunrise and sunset", async () => {
  const data = await loadWeather(config, {
    fetcher: async () => response({ ...forecast, daily: { sunrise: [null], sunset: [null] } }),
  });
  assert.equal(data.sunrise, undefined);
  assert.equal(data.sunset, undefined);
});

test("weather codes select icons without English description matching", () => {
  assert.equal(weatherIcon(95, true), "storm");
  assert.equal(weatherIcon(75, true), "snow");
  assert.equal(weatherIcon(61, true), "rain");
  assert.equal(weatherIcon(45, true), "fog");
  assert.equal(weatherIcon(3, true), "cloud");
  assert.equal(weatherIcon(0, false), "moon");
  assert.equal(weatherIcon(0, true), "sun");
  assert.equal(validCoordinates({ latitude: 0, longitude: 0 }), true);
});
