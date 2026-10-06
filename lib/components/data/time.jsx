import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import useWidget from "../../hooks/use-widget.js";
import { time as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { timeStyles as styles } from "../../styles/components/data/time";

const { React } = Uebersicht;

/**
 * Time widget component.
 * @returns {JSX.Element|null} The rendered widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const config = settings.timeWidgetOptions;
  const { dayProgress, showIcon } = config;
  const visible =
    Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.timeWidget;
  const { data: state, status, error, refresh: getTime } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="time" status={status} error={error} onRetry={getTime} />;

  if (loading) return <DataWidgetLoader.Widget className="time" />;
  if (!state) return null;
  const { time, fillerWidth } = state;

  /**
   * Icon component for the time widget.
   * @returns {JSX.Element} The rendered icon.
   */
  const TimeIcon = () => {
    return <Icon time={time} />;
  };

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="time"
      Icon={showIcon ? TimeIcon : null}
      disableSlider
    >
      {time}
      {dayProgress && (
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
