import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import WidgetStatus from "./widget-status.jsx";
import * as Icons from "../icons/icons.jsx";
import * as Utils from "../../utils.js";
import useWidget from "../../hooks/use-widget.js";
import { weather as definition, weatherIcon } from "../../widgets/weather.js";
import { useSimpleBarContext } from "../rift-bar-context.jsx";

export { definition };
export { weatherStyles as styles } from "../../styles/components/data/weather.js";
const { React } = Uebersicht;

export const Widget = React.memo(() => {
  const { displayUuid, settings } = useSimpleBarContext();
  const config = settings.widgets.weather;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const { data, status, error, refresh } = useWidget(definition, visible, config);
  if (!visible) return null;
  if (status === "idle" || status === "loading")
    return <DataWidgetLoader.Widget className="weather" />;
  if (!data) return <WidgetStatus name="Weather" status={status} error={error} onRetry={refresh} />;
  const now = data.observedAt;
  const classes = Utils.classNames("weather", {
    "weather--sunrise": Math.abs(now - data.sunrise) <= 3600000,
    "weather--sunset": Math.abs(now - data.sunset) <= 3600000,
  });
  const label = `${config.show_location ? `${data.location}, ` : ""}${Math.round(data.temperature)}°${data.unit}`;
  const onRightClick = (event) => {
    event.preventDefault();
    Utils.clickEffect(event);
    refresh();
  };
  return (
    <DataWidget.Widget
      classes={classes}
      status={status}
      title={
        error
          ? `Stale forecast: ${error.message}`
          : "Forecast by Open-Meteo. Right-click to refresh."
      }
      Icon={config.show_icon ? Icons[weatherIcon(data.code, data.isDay)] : null}
      href="https://open-meteo.com/"
      onRightClick={onRightClick}
      disableSlider
    >
      {config.show_gradient && <div className="weather__gradient" />}
      {label}
      {error && " (stale)"}
    </DataWidget.Widget>
  );
});
Widget.displayName = "Weather";
