import * as Uebersicht from "uebersicht";
import * as AppIcons from "../../app-icons";
import { SuspenseIcon } from "../icons/icon.jsx";
import { useRiftBarContext } from "../rift-bar-context.jsx";
import * as Utils from "../../utils";
import * as Rift from "../../rift";

const { React } = Uebersicht;

/**
 * Window component to display a window in the process bar.
 * @param {Object} props - The component props.
 * @param {Object} props.window - The window object.
 * @returns {JSX.Element|null} The rendered component.
 */
export default function Window({ window }) {
  // Get settings from context
  const { settings } = useRiftBarContext();
  // Create a ref for the button element
  const ref = React.useRef();
  // Destructure settings
  const {
    mode,
    show_titles,
    icons_only: displayOnlyIcon,
    expand_all: expandAllProcesses,
  } = settings.process;
  const displayOnlyCurrent = mode === "focused";
  // Destructure window properties
  const { focused, "app-name": appName, "window-title": title, "window-id": id } = window;

  // If displayOnlyCurrent is true and the window is not focused, return null
  if (displayOnlyCurrent && !focused) {
    return null;
  }

  // Get the icon for the app or use the default icon
  const Icon = AppIcons.apps[appName] || AppIcons.apps.Default;

  /**
   * Handle click event on the window button.
   * @param {Event} e - The click event.
   */
  const onClick = (e) => {
    !displayOnlyCurrent && Utils.clickEffect(e);
    Rift.focusWindow(id);
  };

  /**
   * Handle mouse enter event on the window button.
   */
  const onMouseEnter = () => {
    Utils.startSliding(ref.current, ".process__inner", ".process__name");
  };

  /**
   * Handle mouse leave event on the window button.
   */
  const onMouseLeave = () => {
    Utils.stopSliding(ref.current, ".process__name");
  };

  // Generate class names based on settings and window state
  const classes = Utils.classNames("process__window", {
    "process__window--expanded": expandAllProcesses,
    "process__window--focused": focused,
    "process__window--only-current": displayOnlyCurrent,
    "process__window--only-icon": displayOnlyIcon,
  });

  // Clean up the window title
  const cleanedUpName = appName !== title && title.length ? `${appName} / ${title}` : appName;
  const processName = show_titles ? cleanedUpName : appName;

  // Render the window button
  return (
    <button
      ref={ref}
      className={classes}
      onClick={onClick}
      onMouseEnter={displayOnlyIcon ? undefined : onMouseEnter}
      onMouseLeave={displayOnlyIcon ? undefined : onMouseLeave}
    >
      <SuspenseIcon>
        <Icon className="process__icon" />
      </SuspenseIcon>
      {!displayOnlyIcon && (
        <span className="process__inner">
          <span className="process__name">{processName}</span>
        </span>
      )}
    </button>
  );
}
