import * as Uebersicht from "uebersicht";
import { searchLocations, validCoordinates } from "../../widgets/weather.js";

const { React } = Uebersicht;

export default function WeatherLocationPicker({ defaultValue, onChange }) {
  const [query, setQuery] = React.useState(defaultValue.label || "");
  const [results, setResults] = React.useState([]);
  const [error, setError] = React.useState();
  const [loading, setLoading] = React.useState(false);
  const request = React.useRef();
  React.useEffect(
    () => () => {
      request.current?.abort();
      request.current = undefined;
    },
    [],
  );
  const commit = (value) => onChange({ target: { value } });

  const search = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(undefined);
    setResults([]);
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const locations = await searchLocations(query, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(locations);
      if (!locations.length)
        setError("No matching locations. Try a city and country, or enter coordinates.");
    } catch (failure) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? "Location search timed out or was cancelled."
            : failure.message,
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setLoading(false);
    }
  };
  const changeCoordinate = (key) => (event) => {
    const value = event.target.value;
    commit({ ...defaultValue, [key]: value === "" ? null : Number(value) });
  };
  return (
    <div className="weather-location-picker">
      <label>
        City or postal code
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Paris, France"
        />
      </label>
      <button type="button" onClick={search} disabled={loading || query.trim().length < 2}>
        {loading ? "Searching..." : "Search locations"}
      </button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {results.map((location) => (
          <li key={`${location.latitude}:${location.longitude}`}>
            <button
              type="button"
              onClick={() => {
                commit(location);
                setResults([]);
                setQuery(location.label);
              }}
            >
              {location.label}
            </button>
          </li>
        ))}
      </ul>
      <p>
        Selected: {validCoordinates(defaultValue) ? defaultValue.label || "Coordinates" : "none"}
      </p>
      <label>
        Location label
        <input
          value={defaultValue.label}
          onChange={(event) => commit({ ...defaultValue, label: event.target.value })}
        />
      </label>
      <label>
        Latitude
        <input
          type="number"
          min="-90"
          max="90"
          step="any"
          value={defaultValue.latitude ?? ""}
          onChange={changeCoordinate("latitude")}
        />
      </label>
      <label>
        Longitude
        <input
          type="number"
          min="-180"
          max="180"
          step="any"
          value={defaultValue.longitude ?? ""}
          onChange={changeCoordinate("longitude")}
        />
      </label>
      <p>
        Select a search result or enter coordinates. Automatic mode ignores this configured
        location.
      </p>
    </div>
  );
}
