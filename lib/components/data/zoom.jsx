import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import { SuspenseIcon } from "../icons/icon.jsx";
import useWidget from "../../hooks/use-widget.js";
import { zoom as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { zoomStyles as styles } from "../../styles/components/data/zoom";

const { React } = Uebersicht;

/**
 * Zoom widget component.
 * @returns {JSX.Element|null} The Zoom widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const config = settings.zoomWidgetOptions;
  const { showVideo, showMic } = config;
  const visible = Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.zoomWidget;
  const { data: state, status, error, refresh: getZoom } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined) return <WidgetStatus name="zoom" status={status} error={error} onRetry={getZoom} />;

  if (loading) return <DataWidgetLoader.Widget className="zoom" />;
  if (!state || (!state.mic.length && !state.video.length)) return null;

  const { mic, video } = state;

  const VideoIcon = video === "off" ? Icons.CameraOff : Icons.Camera;
  const MicIcon = mic === "off" ? Icons.MicOff : Icons.MicOn;

  return (
    <DataWidget.Widget status={status} title={error?.message} classes="zoom">
      {showVideo && (
        <SuspenseIcon>
          <VideoIcon className={`zoom__icon zoom__icon--${video}`} />
        </SuspenseIcon>
      )}
      {showMic && (
        <SuspenseIcon>
          <MicIcon className={`zoom__icon zoom__icon--${mic}`} />
        </SuspenseIcon>
      )}
    </DataWidget.Widget>
  );
});

Widget.displayName = "Zoom";
