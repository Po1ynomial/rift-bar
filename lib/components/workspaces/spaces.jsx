import * as Uebersicht from "uebersicht";
import Space from "./space.jsx";
import { useWorkspaceContext } from "../workspace-context.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils.js";
export { styles } from "../../styles/components/spaces/spaces.js";
const { React } = Uebersicht;
const Component = React.memo(() => {
  const { spaces } = useWorkspaceContext();
  const { displays, displayUuid, settings } = useSimpleBarContext();
  const options = settings.workspaces;
  if (!Utils.isVisibleOnDisplay(displayUuid, options.displays)) return null;
  const display = displays.find((item) => item.uuid === displayUuid);
  if (!display) return null;
  const visibleSpaces = options.all_displays
    ? spaces
    : spaces.filter((space) => space.displayUuid === displayUuid);
  const processVisible =
    settings.process.mode !== "hidden" &&
    Utils.isVisibleOnDisplay(displayUuid, settings.process.displays);
  return (
    <div className="spaces">
      {visibleSpaces.map((space, index) => (
        <Space
          key={space.workspace}
          space={space}
          lastOfSpace={index !== 0 && space.displayUuid !== visibleSpaces[index - 1].displayUuid}
        />
      ))}
      {processVisible && <div className="spaces__end-separator" />}
    </div>
  );
});
Component.displayName = "Spaces";
export default Component;
