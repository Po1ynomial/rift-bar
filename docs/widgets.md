# Widgets

The bar's data widgets and their runtime contract. For configuration options, see the [configuration guide](config.md) and the [field reference](config-fields.md).

## Widget protocol

A definition declares a stable `id`, a positive default `refreshFrequency`, a `load({ config, signal, force })` function, and a snapshot validator. Views call `useWidget(definition, active, config)` and receive `data`, `status`, `error`, `updatedAt`, and `refresh`. Configuration defaults, validation, controls, and generated schema entries come from `lib/config.js`. Views use the resolved snake_case widget settings directly.

The resource owns polling, a 15-second load deadline, bounded retry backoff, loading/error transitions, and cleanup. It allows one in-flight load per resource, validates results before publication, preserves the last successful snapshot as stale on failure, and ignores results from disposed resources. Missing dependencies use `unavailable` instead of endless loading. Invalid or nonpositive refresh intervals use the widget default; positive intervals have a 250ms lower bound. Manual refreshes and error retries bypass the command-result cache.

Shell commands cannot be physically cancelled through Übersicht's `run` API. After a deadline the resource exits loading and ignores late results, but does not overlap a stuck collector with another attempt. A disposed resource never publishes. Fetch and geolocation collectors honor the abort signal. Command results are cached in shared browser storage across display instances; concurrent commands within one instance share an in-flight promise. Separate WebViews may still race on an initially empty cache.

## Included widgets

The bar includes clock, date, battery/caffeinate, Wi-Fi, output and input volume, keyboard layout, CPU, memory, network statistics, Dock notification badges, weather, GitHub, and Zoom, alongside Rift workspaces and windows.

Zoom depends on its application UI and automation permissions. GitHub requires an authenticated `gh`; an absent binary produces an unavailable state.

## Weather

Weather uses [Open-Meteo](https://open-meteo.com/) current temperature and WMO weather codes, plus sunrise/sunset times. It never sends a city name or placeholder to the forecast endpoint.

In settings, choose `configured` location mode, search for a city or postal code, select the intended result, and save. Alternatively enter latitude and longitude directly. The selected coordinates and label are persisted in `widgets.weather.location`. Configured mode does not request location permission. Automatic mode uses standard browser geolocation coordinates with a five-second timeout and reports permission denial or unavailable location without guessing a city.

Configured mode requires both coordinates; incomplete locations cannot be saved. Transient forecast failures retain the last successful reading and display a stale marker. Right-click requests a fresh forecast. The weather link credits Open-Meteo.
