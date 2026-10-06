import * as Uebersicht from "uebersicht";
import Window from "./window.jsx";
import * as Utils from "../../utils.js";
import { useWorkspaceContext } from "../workspace-context.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
export { styles } from "../../styles/components/process.js";
const { React } = Uebersicht;
const Component = React.memo(() => {
  const { spaces } = useWorkspaceContext();
  const { settings, displayUuid } = useSimpleBarContext();
  const { process, windows: filters } = settings;
  if (process.mode === "hidden" || !Utils.isVisibleOnDisplay(displayUuid, process.displays))
    return null;
  const windows =
    spaces.find((space) => space.focused && space.displayUuid === displayUuid)?.windows || [];
  const visible = windows.filter((window) =>
    Utils.filterApps(window, filters.exclude_apps, filters.exclude_titles),
  );
  if (!visible.length) return null;
  return (
    <div className={Utils.classNames("process", { "process--centered": process.centered })}>
      <div className="process__container">
        {visible.map((window) => (
          <Window key={JSON.stringify(window["window-id"])} window={window} />
        ))}
      </div>
    </div>
  );
});
Component.displayName = "Process";
export default Component;
