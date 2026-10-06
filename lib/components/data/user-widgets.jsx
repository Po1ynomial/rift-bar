import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import useWidget from "../../hooks/use-widget.js";
import { defineWidget, widgetInterval } from "../../widgets/runtime.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Settings from "../../settings";
import * as Utils from "../../utils";

const { React } = Uebersicht;

export default React.memo(UserWidgets);

/**
 * UserWidgets component that renders a list of user-defined widgets.
 * @returns {JSX.Element[]} Array of UserWidget components.
 */
function UserWidgets() {
  const { settings } = useSimpleBarContext();
  const { userWidgetsList } = settings.userWidgets;

  // Get the keys of the userWidgetsList object
  const keys = Object.keys(userWidgetsList);

  // Map over the keys and render a UserWidget for each key
  return keys.map((key) => <UserWidget key={key} index={key} widget={userWidgetsList[key]} />);
}

UserWidgets.displayName = "UserWidgets";

/**
 * UserWidget component that renders an individual user-defined widget.
 * @param {Object} props - The component props.
 * @param {string} props.index - The index of the widget.
 * @param {Object} props.widget - The widget configuration object.
 * @returns {JSX.Element|null} The rendered UserWidget component or null if not visible.
 */
const UserWidget = React.memo(({ index, widget }) => {
  const { displayIndex, settings } = useSimpleBarContext();
  const {
    icon,
    backgroundColor,
    onClickAction,
    onRightClickAction,
    onMiddleClickAction,
    active,
    noIcon,
    hideWhenNoOutput = true,
    showOnDisplay = "",
  } = widget;

  // Determine if the widget should be visible based on display settings and active status
  const visible = Utils.isVisibleOnDisplay(displayIndex, showOnDisplay) && active;

  const definition = React.useMemo(
    () =>
      defineWidget({
        id: `user-${index}`,
        refreshFrequency: 10000,
        load: ({ config, force }) =>
          Utils.cachedRun(config.output, widgetInterval(config.refreshFrequency, 10000), { force }),
        validate: (data) => typeof data === "string",
      }),
    [index],
  );
  const {
    data: state,
    status,
    error,
    refresh: getUserWidget,
  } = useWidget(definition, visible, widget);
  const loading = status === "idle" || status === "loading";
  const isWidgetActive = state !== undefined && Utils.cleanupOutput(state).trim().length > 0;
  if (visible && !loading && state === undefined)
    return (
      <WidgetStatus
        name={widget.title || "Custom widget"}
        status={status}
        error={error}
        onRetry={getUserWidget}
      />
    );

  // Hide widget if not visible or if script indicates it should be inactive (only when hideWhenNoOutput is enabled)
  if (!visible || (!loading && hideWhenNoOutput && !isWidgetActive)) return null;

  const isCustomColor = !Settings.userWidgetColors.includes(backgroundColor);

  const property = settings.global.widgetsBackgroundColorAsForeground ? "color" : "backgroundColor";

  const style = settings.global.noColorInData
    ? undefined
    : {
        [property]: isCustomColor ? backgroundColor : `var(${backgroundColor})`,
      };

  if (loading) return <DataWidgetLoader.Widget style={style} />;

  const Icon = !noIcon ? Icons[icon] : null;

  const hasOnClickAction = onClickAction?.trim().length > 0;
  const hasRightClickAction = onRightClickAction?.trim().length > 0;
  const hasMiddleClickAction = onMiddleClickAction?.trim().length > 0;

  /**
   * Handles the click event for the widget.
   * @param {Event} e - The click event.
   */
  const onClick = async (e) => {
    Utils.clickEffect(e);
    await Uebersicht.run(onClickAction);
    getUserWidget();
  };

  /**
   * Handles the right-click event for the widget.
   * @param {Event} e - The right-click event.
   */
  const onRightClick = async (e) => {
    Utils.clickEffect(e);
    await Uebersicht.run(onRightClickAction);
    getUserWidget();
  };

  /**
   * Handles the middle-click event for the widget.
   * @param {Event} e - The middle-click event.
   */
  const onMiddleClick = async (e) => {
    Utils.clickEffect(e);
    await Uebersicht.run(onMiddleClickAction);
    getUserWidget();
  };

  const onClickProps = {
    onClick: hasOnClickAction ? onClick : undefined,
    onRightClick: hasRightClickAction ? onRightClick : undefined,
    onMiddleClick: hasMiddleClickAction ? onMiddleClick : undefined,
  };

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes={`user-widget user-widget--${index}`}
      Icon={Icon}
      style={style}
      {...onClickProps}
    >
      {state}
    </DataWidget.Widget>
  );
});

UserWidget.displayName = "UserWidget";
