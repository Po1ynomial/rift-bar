import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import useWidget from "../../hooks/use-widget.js";
import { wifi as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { wifiStyles as styles } from "../../styles/components/data/wifi";

const { React } = Uebersicht;

/**
 * Wifi widget component.
 * @returns {JSX.Element|null} The Wifi widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings, pushMissive } = useSimpleBarContext();
  const config = settings.networkWidgetOptions;
  const { hideWifiIfDisabled, toggleWifiOnClick, networkDevice, hideNetworkName, showIcon } = config;
  const visible = Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.wifiWidget;
  const { data: state, status, error, refresh: getWifi } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  if (!visible) return null;
  if (!loading && state === undefined) return <WidgetStatus name="wifi" status={status} error={error} onRetry={getWifi} />;

  if (loading) return <DataWidgetLoader.Widget className="wifi" />;
  if (!state) return null;

  const { status: connectionStatus, ssid } = state;
  const isActive = connectionStatus === "active";
  const name = renderName(ssid, hideNetworkName);

  if (hideWifiIfDisabled && !isActive) return null;

  const classes = Utils.classNames("wifi", {
    "wifi--hidden-name": !name,
    "wifi--inactive": !isActive,
  });

  const Icon = isActive ? Icons.Wifi : Icons.WifiOff;

  /**
   * Handles the click event to toggle wifi.
   * @param {React.MouseEvent} e - The click event.
   */
  const onClick = async (e) => {
    Utils.clickEffect(e);
    await toggleWifi(isActive, networkDevice, pushMissive);
    getWifi();
  };

  return (
    <DataWidget.Widget
      status={status}
      title={error?.message}
      classes={classes}
      Icon={showIcon ? Icon : null}
      onClick={toggleWifiOnClick ? onClick : undefined}
      onRightClick={openWifiPreferences}
    >
      {name}
    </DataWidget.Widget>
  );
});

Widget.displayName = "Wifi";

/**
 * Toggles the wifi on or off.
 * @param {boolean} isActive - Whether the wifi is currently active.
 * @param {string} networkDevice - The network device name.
 * @param {function} pushMissive - Function to push notifications.
 */
async function toggleWifi(isActive, networkDevice, pushMissive) {
  if (isActive) {
    await Uebersicht.run(`networksetup -setairportpower ${networkDevice} off`);
    Utils.notification("Disabling network...", pushMissive);
  } else {
    await Uebersicht.run(`networksetup -setairportpower ${networkDevice} on`);
    Utils.notification("Enabling network...", pushMissive);
  }
}

/**
 * Opens the wifi preferences pane.
 * @param {React.MouseEvent} e - The click event.
 */
function openWifiPreferences(e) {
  Utils.clickEffect(e);
  Uebersicht.run(`open /System/Library/PreferencePanes/Network.prefPane/`);
}

/**
 * Renders the wifi network name.
 * @param {string} name - The network name.
 * @param {boolean} hideNetworkName - Whether to hide the network name.
 * @returns {string} The rendered network name.
 */
function renderName(name, hideNetworkName) {
  // macOS can withhold the SSID while Wi-Fi remains connected.
  if (!name || hideNetworkName || name === "<redacted>") return "";
  if (name === "with an AirPort network.y off.") return "Disabled";
  if (name === "with an AirPort network.") return "Searching...";
  return name;
}
