import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import useWidget from "../../hooks/use-widget.js";
import { memory as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { memoryStyles as styles } from "../../styles/components/data/memory";

const { React } = Uebersicht;

/**
 * Memory Widget component
 * @returns {JSX.Element|null} The memory widget component
 */
export const Widget = () => {
  const { displayIndex, settings } = useSimpleBarContext();
  const config = settings.memoryWidgetOptions;
  const { memoryMonitorApp, showIcon, memoryUsageThreshold } = config;
  const visible = Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.memoryWidget;
  const { data: state, status, error, refresh: getMemory } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined) return <WidgetStatus name="memory" status={status} error={error} onRetry={getMemory} />;

  if (loading) return <DataWidgetLoader.Widget className="memory" />;
  if (!state) return null;

  const { free } = state;
  const used = 100 - free;
  const threshold = Number(memoryUsageThreshold) || 0;

  if (threshold > 0 && used < threshold) return null;

  // Handle click event to open memory usage app
  const onClick =
    memoryMonitorApp === "None"
      ? undefined
      : (e) => {
          Utils.clickEffect(e);
          openMemoryUsageApp(memoryMonitorApp);
        };

  /**
   * Pie chart component for memory usage
   * @returns {JSX.Element} The pie chart component
   */
  const Pie = () => {
    return (
      <div
        className="memory__pie"
        style={{
          backgroundImage: `conic-gradient(var(--pie-color) ${used}%, var(--main-alt) ${used}% 100%)`,
        }}
      />
    );
  };

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
      Icon={showIcon ? Pie : null}
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
    case "Activity Monitor":
      Uebersicht.run(`open -a "Activity Monitor"`);
      break;
    case "Top":
      Utils.runInUserTerminal("top");
      break;
  }
}
