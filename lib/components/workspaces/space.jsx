import * as Uebersicht from "uebersicht";
import OpenedApps from "./opened-apps.jsx";
import { useSimpleBarContext } from "../rift-bar-context.jsx";
import * as Utils from "../../utils.js";
import * as Rift from "../../rift.js";
const { React } = Uebersicht;
export default function Space({ space, lastOfSpace }) {
  const { settings, displayUuid } = useSimpleBarContext();
  const { workspaces, windows: filters } = settings;
  if (!space.focused && !space.windows.length && !workspaces.show_empty) return null;
  const filtered = space.windows.filter((window) =>
    Utils.filterApps(window, filters.exclude_apps, filters.exclude_titles),
  );
  const apps = workspaces.deduplicate_apps
    ? filtered.filter(
        (window, index) =>
          filtered.findIndex((other) => other["app-name"] === window["app-name"]) === index,
      )
    : filtered;
  const onClick = (event) => {
    if (space.focused && space.displayUuid === displayUuid) return;
    Rift.goToSpace(space);
    Utils.clickEffect(event);
  };
  return (
    <React.Fragment>
      {workspaces.all_displays && lastOfSpace && <div className="spaces__separator" />}
      <div
        className={Utils.classNames("space", {
          "space--focused": space.focused,
          "space--empty": !space.windows.length,
        })}
      >
        <button className="space__inner" data-workspace={space.workspace} onClick={onClick}>
          {space.name ?? space.workspace}
          {workspaces.show_app_icons && <OpenedApps apps={apps} />}
        </button>
      </div>
    </React.Fragment>
  );
}
