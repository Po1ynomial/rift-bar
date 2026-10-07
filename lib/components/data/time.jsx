import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import useWidget from "../../hooks/use-widget.js";
import { time as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useRiftBarContext } from "../rift-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { timeStyles as styles } from "../../styles/components/data/time";

const { React } = Uebersicht;

/**
 * Time widget component.
 * @returns {JSX.Element|null} The rendered widget.
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings } = useRiftBarContext();
  const config = settings.widgets.clock;
  const { day_progress, show_icon } = config;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const { data: state, status, error, refresh: getTime } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="time" status={status} error={error} onRetry={getTime} />;

  if (loading) return <DataWidgetLoader.Widget className="time" />;
  if (!state) return null;
  const { time, fillerWidth } = state;

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="time"
      icon={show_icon ? <Icon time={time} /> : null}
      disableSlider
    >
      {time}
      {day_progress && (
        <div className="time__filler" style={{ transform: `scaleX(${fillerWidth})` }} />
      )}
    </DataWidget.Widget>
  );
});

Widget.displayName = "Time";

/**
 * Icon component for displaying the time as a clock.
 * @param {Object} props - The component props.
 * @param {string} props.time - The current time string.
 * @returns {JSX.Element} The rendered icon.
 */
function Icon({ time }) {
  const [hours, minutes] = time.split(":");

  const hoursInDegree = ((parseInt(hours, 10) % 12) / 12) * 360;
  const minutesInDegree = (parseInt(minutes, 10) / 60) * 360;

  return (
    <div className="time__icon">
      <div className="time__hours" style={{ transform: `rotate(${hoursInDegree}deg)` }} />
      <div className="time__minutes" style={{ transform: `rotate(${minutesInDegree}deg)` }} />
    </div>
  );
}
