import * as Uebersicht from "uebersicht";
import { definition, editOverride } from "../../config.js";
import SettingsInner from "./settings-inner.jsx";
const { React } = Uebersicht;

export default function SettingsWidgets({ overrides, effective, setOverrides }) {
  const [selected, setSelected] = React.useState();
  if (selected)
    return (
      <div className="settings__widget-settings">
        <button type="button" onClick={() => setSelected(undefined)}>
          Back to widgets
        </button>
        <div className="settings__inner-title">
          {definition.properties.widgets.properties[selected].label}
        </div>
        <SettingsInner
          section={`widgets.${selected}`}
          overrides={overrides}
          effective={effective}
          setOverrides={setOverrides}
        />
      </div>
    );
  return (
    <div className="settings__widgets-list">
      {Object.entries(definition.properties.widgets.properties).map(([name, node]) => (
        <div key={name} className="settings__widgets-item">
          <input
            type="checkbox"
            aria-label={`Enable ${node.label}`}
            checked={effective.widgets[name].enabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setOverrides((current) => editOverride(current, `widgets.${name}.enabled`, enabled));
            }}
          />
          <button type="button" onClick={() => setSelected(name)}>
            {node.label}
          </button>
        </div>
      ))}
    </div>
  );
}
