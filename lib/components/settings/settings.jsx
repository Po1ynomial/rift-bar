import * as Uebersicht from "uebersicht";
import * as Utils from "../../utils.js";
import * as Settings from "../../settings.js";
import { editOverride } from "../../config.js";
export { settingsStyles as styles } from "../../styles/components/settings/settings.js";
const { React } = Uebersicht;
export const Component = React.lazy(() => import("./settings-component.jsx"));

export function Wrapper() {
  const [visible, setVisible] = React.useState(false);
  const [error, setError] = React.useState();
  const closeSettings = () => {
    setVisible(false);
    Utils.blurBar();
  };
  const handleKeydown = React.useCallback(async (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (!["r", ",", "t"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === ",") {
      setVisible(true);
      return;
    }
    try {
      if (event.key === "r") await Settings.reload();
      if (event.key === "t") {
        const state = Settings.getState();
        const mode = state.settings.appearance.theme;
        const dark =
          mode === "dark" ||
          (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        await Settings.set(
          editOverride(state.overrides, "appearance.theme", dark ? "light" : "dark"),
          state,
        );
      }
      setError(undefined);
      await Utils.softRefresh();
    } catch (failure) {
      setError(failure.message || String(failure));
    }
  }, []);
  React.useEffect(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [handleKeydown]);
  return (
    <React.Fragment>
      {error && (
        <span className="config-error" role="alert" title={error}>
          Configuration: {error}
        </span>
      )}
      {visible && (
        <React.Suspense fallback={<React.Fragment />}>
          <Component closeSettings={closeSettings} />
        </React.Suspense>
      )}
    </React.Fragment>
  );
}
