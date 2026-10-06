import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import useWidget from "../../hooks/use-widget.js";
import { keyboard as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { keyboardStyles as styles } from "../../styles/components/data/keyboard";

const { React } = Uebersicht;

/**
 * Keyboard widget component.
 * @returns {JSX.Element|null} The rendered widget or null if not visible.
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings } = useSimpleBarContext();
  const config = settings.widgets.keyboard;
  const { show_icon, max_characters } = config;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const {
    data: state,
    status,
    error,
    refresh: getKeyboard,
  } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="keyboard" status={status} error={error} onRetry={getKeyboard} />;

  if (loading) return <DataWidgetLoader.Widget className="keyboard" />;
  if (!state) return null;
  const { keyboard } = state;

  const maxLength = Number(max_characters) || 0;
  const displayKeyboard = maxLength > 0 ? keyboard.slice(0, maxLength) : keyboard;

  if (!displayKeyboard?.length) return null;

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="keyboard"
      Icon={show_icon ? Icons.Keyboard : null}
    >
      {displayKeyboard}
    </DataWidget.Widget>
  );
});

Widget.displayName = "Keyboard";
