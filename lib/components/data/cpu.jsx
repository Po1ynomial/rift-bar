import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import Graph from "./graph.jsx";
import * as Icons from "../icons/icons.jsx";
import useWidget from "../../hooks/use-widget.js";
import { cpu as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useRiftBarContext } from "../rift-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { cpuStyles as styles } from "../../styles/components/data/cpu";

const { React } = Uebersicht;

const GRAPH_LENGTH = 50;

/**
 * CPU Widget component
 * @returns {JSX.Element|null} The CPU widget
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings } = useRiftBarContext();
  const config = settings.widgets.cpu;
  const { display, monitor_app, show_icon, hide_below_percent } = config;
  const displayAsGraph = display === "graph";
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const { data: state, status, error, refresh: getCpu } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  const [graph, setGraph] = React.useState([]);
  React.useEffect(() => {
    if (state && displayAsGraph) Utils.addToGraphHistory(state, setGraph, GRAPH_LENGTH);
  }, [state, displayAsGraph]);
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="cpu" status={status} error={error} onRetry={getCpu} />;

  if (loading) return <DataWidgetLoader.Widget className="cpu" />;
  if (!state) return null;

  const { usage } = state;
  const threshold = Number(hide_below_percent) || 0;
  const usageValue = Number(usage) || 0;

  if (threshold > 0 && usageValue < threshold) return null;

  // Handle click event to open CPU monitor app
  const onClick =
    monitor_app === "none"
      ? undefined
      : (e) => {
          Utils.clickEffect(e);
          openCpuUsageApp(monitor_app);
        };

  if (displayAsGraph) {
    return (
      <DataWidget.Widget
        status={status}
        title={error?.message}
        classes="cpu cpu--graph"
        onClick={onClick}
        disableSlider
      >
        <Graph
          className="cpu__graph"
          caption={{
            usage: {
              value: `${usage}%`,
              icon: show_icon ? Icons.CPU : null,
              color: "var(--yellow)",
            },
          }}
          values={graph}
          maxLength={GRAPH_LENGTH}
          maxValue={100}
        />
      </DataWidget.Widget>
    );
  }

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="cpu"
      Icon={show_icon ? Icons.CPU : null}
      onClick={onClick}
    >
      <span className="cpu__usage">{usage}%</span>
    </DataWidget.Widget>
  );
});

Widget.displayName = "Cpu";

/**
 * Open the specified CPU usage monitoring application
 * @param {string} app - The name of the application to open
 */
function openCpuUsageApp(app) {
  switch (app) {
    case "activity_monitor":
      Uebersicht.run(`open -a "Activity Monitor"`);
      break;
    case "top":
      Utils.runInUserTerminal("top");
      break;
  }
}
