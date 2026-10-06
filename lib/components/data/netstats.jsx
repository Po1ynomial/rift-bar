import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import { SuspenseIcon } from "../icons/icon.jsx";
import Graph from "./graph.jsx";
import useWidget from "../../hooks/use-widget.js";
import { netstats as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils.js";

export { definition };
export { netstatsStyles as styles } from "../../styles/components/data/netstats";

const { React } = Uebersicht;

const GRAPH_LENGTH = 30;

/**
 * Netstats widget component.
 * @returns {JSX.Element|null} The rendered component.
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings } = useSimpleBarContext();
  const config = settings.widgets.network_stats;
  const { display, show_icon, hide_below_kib_per_second } = config;
  const displayAsGraph = display === "graph";
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const {
    data: state,
    status,
    error,
    refresh: getNetstats,
  } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  const [graph, setGraph] = React.useState([]);
  React.useEffect(() => {
    if (state && displayAsGraph) Utils.addToGraphHistory(state, setGraph, GRAPH_LENGTH);
  }, [state, displayAsGraph]);
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="netstats" status={status} error={error} onRetry={getNetstats} />;

  if (loading)
    return (
      <React.Fragment>
        <DataWidgetLoader.Widget className="netstats" />
        {!displayAsGraph && <DataWidgetLoader.Widget className="netstats" />}
      </React.Fragment>
    );

  if (!state) {
    return null;
  }

  const { download, upload } = state;

  if (download === undefined || upload === undefined) {
    return null;
  }

  const threshold = (Number(hide_below_kib_per_second) || 0) * 1024;
  const isBelowThreshold =
    threshold > 0 && Math.abs(download) < threshold && Math.abs(upload) < threshold;

  if (isBelowThreshold) {
    return null;
  }

  const formattedDownload = Utils.formatBytes(download);
  const formattedUpload = Utils.formatBytes(upload);

  if (displayAsGraph) {
    return (
      <DataWidget.Widget
        status={status}
        title={error?.message}
        classes="netstats netstats--graph"
        disableSlider
      >
        <Graph
          className="netstats__graph"
          caption={{
            download: {
              value: formattedDownload,
              icon: show_icon ? Icons.Download : null,
              color: "var(--magenta)",
            },
            upload: {
              value: formattedUpload,
              icon: show_icon ? Icons.Upload : null,
              color: "var(--blue)",
            },
          }}
          values={graph}
          maxLength={GRAPH_LENGTH}
        />
      </DataWidget.Widget>
    );
  }

  return (
    <React.Fragment>
      <DataWidget.Widget status={status} title={error?.message} classes="netstats" disableSlider>
        <div className="netstats__item">
          {show_icon && (
            <SuspenseIcon>
              <Icons.Download className="netstats__icon netstats__icon--download" />
            </SuspenseIcon>
          )}
          <span
            className="netstats__value"
            dangerouslySetInnerHTML={{ __html: formattedDownload }}
          />
        </div>
      </DataWidget.Widget>
      <DataWidget.Widget status={status} title={error?.message} classes="netstats" disableSlider>
        <div className="netstats__item">
          {show_icon && (
            <SuspenseIcon>
              <Icons.Upload className="netstats__icon netstats__icon--upload" />
            </SuspenseIcon>
          )}
          <span className="netstats__value" dangerouslySetInnerHTML={{ __html: formattedUpload }} />
        </div>
      </DataWidget.Widget>
    </React.Fragment>
  );
});

Widget.displayName = "Netstats";
