import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import * as Utils from "../../utils";
import useWidget from "../../hooks/use-widget.js";
import { date as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";

export { definition };
export { dateStyles as styles } from "../../styles/components/data/date-display";

const { React } = Uebersicht;

/**
 * Date display widget component.
 * @returns {JSX.Element} The date display widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const config = settings.dateWidgetOptions;
  const { calendarApp, showIcon } = config;
  const visible = Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.dateWidget;
  const { data: state, status, error, refresh: getDate } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined) return <WidgetStatus name="date" status={status} error={error} onRetry={getDate} />;

  if (loading) return <DataWidgetLoader.Widget className="date-display" />;
  if (!state) return null;
  const { now } = state;

  /**
   * Handle click event to open the calendar application.
   * @param {Event} e - The click event.
   */
  const onClick = (e) => {
    Utils.clickEffect(e);
    openCalendarApp(calendarApp);
  };

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="date-display"
      Icon={showIcon ? Icons.Date : null}
      onClick={onClick}
    >
      {now}
    </DataWidget.Widget>
  );
});

Widget.displayName = "DateDisplay";

/**
 * Open the specified calendar application.
 * @param {string} calendarApp - The name of the calendar application to open.
 */
function openCalendarApp(calendarApp) {
  const appName = calendarApp || "Calendar";
  Uebersicht.run(`open -a "${appName}"`);
}
