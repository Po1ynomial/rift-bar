import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import useWidget from "../../hooks/use-widget.js";
import { github as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils.js";

export { definition };
export { githubStyles as styles } from "../../styles/components/data/github.js";

const { React } = Uebersicht;

/**
 * GitHub notification widget component
 * @returns {JSX.Element|null} The GitHub notification widget component
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const config = settings.githubWidgetOptions;
  const { hideWhenNoNotification, notificationUrl, showIcon } = config;
  const visible = Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.githubWidget;
  const { data: state, status, error, refresh: getGitHub } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined) return <WidgetStatus name="github" status={status} error={error} onRetry={getGitHub} />;

  if (loading) return <DataWidgetLoader.Widget className="github" />;
  if (!state) return null;

  const { count } = state;

  if (hideWhenNoNotification && count === 0) return null;

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes="github"
      href={notificationUrl}
      Icon={showIcon ? Icons.GitHub : null}
      onRightClick={getGitHub}
    >
      <span className="github__count">{count}</span>
    </DataWidget.Widget>
  );
});

Widget.displayName = "GitHub";
