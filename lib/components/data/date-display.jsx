import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import * as Utils from "../../utils";
import { shellQuote } from "../../rift.js";
import useWidget from "../../hooks/use-widget.js";
import { date as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../rift-bar-context.jsx";

export { definition };
export { dateStyles as styles } from "../../styles/components/data/date-display";

const { React } = Uebersicht;

/**
 * Date display widget component.
 * @returns {JSX.Element} The date display widget.
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings } = useSimpleBarContext();
  const config = settings.widgets.date;
  const { calendar_app, show_icon } = config;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const { data: state, status, error, refresh: getDate } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="date" status={status} error={error} onRetry={getDate} />;

  if (loading) return <DataWidgetLoader.Widget className="date-display" />;
  if (!state) return null;
  const { now } = state;

  /**
   * Handle click event to open the calendar application.
   * @param {Event} e - The click event.
   */
  const onClick = (e) => {
    Utils.clickEffect(e);
    openCalendarApp(calendar_app);
  };

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="date-display"
      Icon={show_icon ? Icons.Date : null}
      onClick={onClick}
    >
      {now}
    </DataWidget.Widget>
  );
});

Widget.displayName = "DateDisplay";

/**
 * Open the specified calendar application.
 * @param {string} calendar_app - The name of the calendar application to open.
 */
function openCalendarApp(calendar_app) {
  const appName = calendar_app || "Calendar";
  Uebersicht.run(`open -a ${shellQuote(appName)}`);
}
