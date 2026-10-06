import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import { SuspenseIcon } from "../icons/icon.jsx";
import useWidget from "../../hooks/use-widget.js";
import { battery as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { batteryStyles as styles } from "../../styles/components/data/battery";

const { React } = Uebersicht;

/**
 * Battery widget component
 * @returns {JSX.Element|null} The battery widget component
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings, pushMissive } = useSimpleBarContext();
  const config = settings.widgets.battery;
  const { toggle_caffeinate, highlight_caffeinate, show_icon } = config;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const {
    data: state,
    status,
    error,
    refresh: getBattery,
  } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="battery" status={status} error={error} onRetry={getBattery} />;

  if (loading) return <DataWidgetLoader.Widget className="battery" />;
  if (!state) return null;

  const { system, percentage, charging, caffeinate, lowPowerMode } = state;
  const isLowBattery = !charging && percentage < 20;

  const classes = Utils.classNames("battery", {
    "battery--low": isLowBattery,
    "battery--low-power-mode": lowPowerMode,
    "battery--caffeinate": highlight_caffeinate && caffeinate.length > 0,
  });

  const transformValue = getTransform(percentage);

  /**
   * Handle click event to toggle caffeinate mode
   * @param {React.MouseEvent} e - The click event
   */
  const onClick = async (e) => {
    Utils.clickEffect(e);
    await toggleCaffeinate(system, caffeinate, config, pushMissive);
    getBattery();
  };

  const onClickProp = toggle_caffeinate ? { onClick } : {};

  const Icon = () => (
    <div className="battery__icon">
      <div className="battery__icon-inner">
        <div className="battery__icon-filler" style={{ transform: transformValue }} />
        {charging && (
          <SuspenseIcon>
            <Icons.Charging className="battery__charging-icon" />
          </SuspenseIcon>
        )}
      </div>
    </div>
  );

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes={classes}
      Icon={show_icon ? Icon : null}
      disableSlider
      {...onClickProp}
    >
      {caffeinate.length > 0 && (
        <SuspenseIcon>
          <Icons.Coffee className="battery__caffeinate-icon" />
        </SuspenseIcon>
      )}
      {percentage}%
    </DataWidget.Widget>
  );
});

Widget.displayName = "Battery";

/**
 * Get the transform value for the battery icon based on the percentage
 * @param {number} value - The battery percentage
 * @returns {string} The transform value
 */
function getTransform(value) {
  let transform = `0.${value}`;
  if (value === 100) transform = "1";
  if (value < 10) transform = `0.0${value}`;
  return `scaleX(${transform})`;
}

/**
 * Toggle caffeinate mode on or off
 * @param {string} system - The system architecture
 * @param {string} caffeinate - The current caffeinate state
 * @param {string} option - The caffeinate option
 * @param {function} pushMissive - Function to push notifications
 */
async function toggleCaffeinate(system, caffeinate, config, pushMissive) {
  const command = system === "x86_64" ? "caffeinate" : "arch -arch arm64 caffeinate";
  const scope = { system: "-i", display: "-d", both: "-di" }[config.caffeinate_scope];
  const timeout =
    config.caffeinate_timeout_seconds > 0 ? `-t ${config.caffeinate_timeout_seconds}` : "";
  if (caffeinate.length === 0) {
    Uebersicht.run(`${command} ${scope} ${timeout} &`);
    Utils.notification("Enabling caffeinate...", pushMissive);
  } else {
    await Uebersicht.run("pkill -f caffeinate");
    Utils.notification("Disabling caffeinate...", pushMissive);
  }
}
