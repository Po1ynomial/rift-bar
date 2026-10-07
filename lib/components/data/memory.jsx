import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import useWidget from "../../hooks/use-widget.js";
import { memory as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useRiftBarContext } from "../rift-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { memoryStyles as styles } from "../../styles/components/data/memory";

const { React } = Uebersicht;

/**
 * Memory Widget component
 * @returns {JSX.Element|null} The memory widget component
 */
export const Widget = () => {
  const { displayUuid, settings } = useRiftBarContext();
  const config = settings.widgets.memory;
  const { monitor_app, show_icon, hide_below_percent } = config;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const { data: state, status, error, refresh: getMemory } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="memory" status={status} error={error} onRetry={getMemory} />;

  if (loading) return <DataWidgetLoader.Widget className="memory" />;
  if (!state) return null;

  const { free } = state;
  const used = 100 - free;
  const threshold = Number(hide_below_percent) || 0;

  if (threshold > 0 && used < threshold) return null;

  // Handle click event to open memory usage app
  const onClick =
    monitor_app === "none"
      ? undefined
      : (e) => {
          Utils.clickEffect(e);
          openMemoryUsageApp(monitor_app);
        };

  // A pie chart icon for memory usage, rendered from the current reading.
  const pie = (
    <div
      className="memory__pie"
      style={{
        backgroundImage: `conic-gradient(var(--pie-color) ${used}%, var(--main-alt) ${used}% 100%)`,
      }}
    />
  );

  const classes = Utils.classNames("memory", {
    "memory--low": used <= 30,
    "memory--medium": used > 30 && used <= 70,
    "memory--high": used > 70,
  });

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes={classes}
      icon={show_icon ? pie : null}
      onClick={onClick}
    >
      <div className="memory__content">{used}%</div>
    </DataWidget.Widget>
  );
};

/**
 * Open the specified memory usage application
 * @param {string} app - The name of the application to open
 */
function openMemoryUsageApp(app) {
  switch (app) {
    case "activity_monitor":
      Uebersicht.run(`open -a "Activity Monitor"`);
      break;
    case "top":
      Utils.runInUserTerminal("top");
      break;
  }
}
