import * as Uebersicht from "uebersicht";
import { controls, definition, editOverride, getPath } from "../../config.js";
import SettingsItem from "./settings-item.jsx";
import WeatherLocationPicker from "./weather-location-picker.jsx";
import { useRiftBarContext } from "../rift-bar-context.jsx";

const { React } = Uebersicht;
export default function SettingsInner({ section, overrides, effective, setOverrides }) {
  const { displays = [] } = useRiftBarContext();
  const node = getPath(definition, "properties." + section.split(".").join(".properties."));
  const fields = controls(node, section);
  return fields.map((field) => {
    const value = getPath(effective, field.path);
    const inherited = getPath(overrides, field.path) === undefined;
    const change = (next) => setOverrides((current) => editOverride(current, field.path, next));
    const reset = () =>
      setOverrides((current) => {
        let result = editOverride(current, field.path, undefined);
        if (field.type === "location")
          result = editOverride(result, "widgets.weather.location_mode", undefined);
        return result;
      });
    return (
      <div className="settings__item settings__item--full-width" key={field.path}>
        <div className="settings__field-heading">
          <label htmlFor={field.path}>{field.label}</label>
          <small>
            {field.path} · {inherited ? "Inherited" : "Override"}
          </small>
          <button type="button" onClick={reset} disabled={inherited}>
            Reset
          </button>
        </div>
        {field.type === "location" ? (
          <WeatherLocationPicker
            defaultValue={value}
            onChange={(event) => {
              const location = Object.fromEntries(
                Object.entries(event.target.value).filter(
                  ([, item]) => item !== null && item !== undefined,
                ),
              );
              change(location);
            }}
          />
        ) : (
          <SettingsItem
            code={field.path}
            field={field}
            value={value}
            onChange={change}
            displayOptions={displays}
          />
        )}
      </div>
    );
  });
}
