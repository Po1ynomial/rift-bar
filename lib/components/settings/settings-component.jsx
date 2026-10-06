import * as Uebersicht from "uebersicht";
import * as Settings from "../../settings.js";
import * as Utils from "../../utils.js";
import { definition, previewConfig, rebaseOverrides } from "../../config.js";
import SettingsInner from "./settings-inner.jsx";
import SettingsWidgets from "./settings-widgets.jsx";

const { React } = Uebersicht;
const TABS = Object.keys(definition.properties);

export default function Component({ closeSettings }) {
  const [session, setSession] = React.useState(() => Settings.getState());
  const [overrides, setOverrides] = React.useState(() => Settings.getState().overrides);
  const [currentTab, setCurrentTab] = React.useState(0);
  const [error, setError] = React.useState();
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(session.overrides) !== JSON.stringify(overrides);
  const effective = React.useMemo(() => previewConfig(overrides), [overrides]);
  const save = async (event) => {
    Utils.clickEffect(event);
    setSaving(true);
    setError(undefined);
    try {
      await Settings.set(overrides, session);
      const next = Settings.getState();
      setSession(next);
      setOverrides(next.overrides);
      await Utils.softRefresh();
    } catch (failure) {
      setError(failure.message || String(failure));
    } finally {
      setSaving(false);
    }
  };
  const reload = async () => {
    setSaving(true);
    try {
      await Settings.reload();
      const next = Settings.getState();
      // An explicit reload keeps edits, but also preserves untouched external fields.
      setOverrides(
        dirty ? rebaseOverrides(session.overrides, overrides, next.overrides) : next.overrides,
      );
      setSession(next);
      setError(undefined);
      await Utils.softRefresh();
    } catch (failure) {
      setError(failure.message || String(failure));
    } finally {
      setSaving(false);
    }
  };
  const discard = () => {
    setOverrides(session.overrides);
    setError(undefined);
  };
  const section = TABS[currentTab];
  return (
    <div className="settings">
      <div className="settings__overlay" onClick={closeSettings} />
      <div className="settings__outer">
        <div className="settings__header">
          <button
            className="settings__header-dot settings__header-dot--close"
            onClick={closeSettings}
            aria-label="Close settings"
          />
          Settings
        </div>
        <div className="settings__tabs">
          {TABS.map((key, index) => (
            <button
              key={key}
              className={`settings__tab${index === currentTab ? " settings__tab--current" : ""}`}
              onClick={() => setCurrentTab(index)}
            >
              {definition.properties[key].label}
            </button>
          ))}
        </div>
        <div className="settings__inner">
          <fieldset className="settings__category settings__editing-fields" disabled={saving}>
            <div className="settings__inner-title">{definition.properties[section].label}</div>
            {section === "widgets" ? (
              <SettingsWidgets
                overrides={overrides}
                effective={effective}
                setOverrides={setOverrides}
              />
            ) : (
              <SettingsInner
                section={section}
                overrides={overrides}
                effective={effective}
                setOverrides={setOverrides}
              />
            )}
          </fieldset>
        </div>
        <div className="settings__bottom">
          <div className="settings__config-path">{session.path || "XDG configuration"}</div>
          <p>Unset fields inherit builtin defaults. Reset removes an override.</p>
          {(error || Settings.getState().error) && (
            <p role="alert">{error || Settings.getState().error.message}</p>
          )}
          <button type="button" onClick={reload} disabled={saving}>
            {dirty ? "Reload and keep edited fields" : "Reload configuration"}
          </button>
          <button type="button" onClick={discard} disabled={saving || !dirty}>
            Discard edits
          </button>
          <button className="settings__refresh-button" onClick={save} disabled={!dirty || saving}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
