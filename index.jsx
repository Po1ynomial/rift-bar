import * as Uebersicht from "uebersicht";
import * as Error from "./lib/components/error.jsx";
import SimpleBarContextProvider from "./lib/components/simple-bar-context.jsx";
import UserWidgets from "./lib/components/data/user-widgets.jsx";
// Each simple-bar widgets exports both a "Component" or "Widget" render function
// and a "styles" string containing its own CSS
import * as Variables from "./lib/styles/core/variables";
import * as Base from "./lib/styles/core/base";
import * as Spaces from "./lib/styles/components/spaces/spaces";
import * as Process from "./lib/styles/components/process";
import * as Zoom from "./lib/components/data/zoom.jsx";
import * as Time from "./lib/components/data/time.jsx";
import * as DateDisplay from "./lib/components/data/date-display.jsx";
import * as GitHub from "./lib/components/data/github.jsx";
import * as Weather from "./lib/components/data/weather.jsx";
import * as Netstats from "./lib/components/data/netstats.jsx";
import * as Cpu from "./lib/components/data/cpu.jsx";
import * as Memory from "./lib/components/data/memory.jsx";
import * as Battery from "./lib/components/data/battery.jsx";
import * as Sound from "./lib/components/data/sound.jsx";
import * as Mic from "./lib/components/data/mic.jsx";
import * as Wifi from "./lib/components/data/wifi.jsx";
import * as Keyboard from "./lib/components/data/keyboard.jsx";
import * as Notifications from "./lib/components/data/notifications.jsx";
import * as Graph from "./lib/components/data/graph.jsx";
import * as DataWidgetLoader from "./lib/components/data/data-widget-loader.jsx";
import * as DataWidget from "./lib/components/data/data-widget.jsx";
import * as SideIcon from "./lib/components/side-icon.jsx";
import * as Missives from "./lib/components/missives/missives.jsx";
import * as Utils from "./lib/utils";
import * as Settings from "./lib/settings";
import * as Rift from "./lib/rift";

// Destructure React from Uebersicht in order to make eslint catch hook rules for example
const { React } = Uebersicht;

const WorkspaceContextProvider = React.lazy(
  () => import("./lib/components/workspace-context.jsx"),
);
const WorkspaceSpaces = React.lazy(
  () => import("./lib/components/workspaces/spaces.jsx"),
);
const WorkspaceProcess = React.lazy(
  () => import("./lib/components/workspaces/process.jsx"),
);

// Window-manager events trigger refreshes. No periodic workspace polling.
const refreshFrequency = false;

let initialization;
let initializedSettings;

function initialize() {
  if (!initialization) {
    initialization = Settings.init().then((settings) => {
      // No preference reads or style generation during module evaluation.
      Utils.injectStyles("simple-bar-index-styles", [
        Variables.buildStyles(settings),
        Base.styles,
        Spaces.styles,
        Process.styles,
        Settings.styles,
        DataWidget.styles,
        DateDisplay.styles,
        Zoom.styles,
        Time.styles,
        GitHub.styles,
        Weather.styles,
        Netstats.styles,
        Cpu.styles,
        Memory.styles,
        Battery.styles,
        Wifi.styles,
        Keyboard.styles,
        Mic.styles,
        Sound.styles,
        Notifications.styles,
        Graph.styles,
        DataWidgetLoader.styles,
        settings.customStyles.styles,
        SideIcon.styles,
        Missives.styles,
      ]);
      initializedSettings = settings;
    }).catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

async function command() {
  await initialize();
  return Rift.getSnapshot();
}

// Render function to display the bar
function render({ output, error }) {
  const settings = initializedSettings ?? Settings.defaultSettings;
  // Define base classes for the bar based on settings
  const baseClasses = Utils.classNames("simple-bar", {
    "simple-bar--floating": settings.global.floatingBar,
    "simple-bar--no-bar-background": settings.global.noBarBg,
    "simple-bar--no-color-in-data": settings.global.noColorInData,
    "simple-bar--on-bottom": settings.global.bottomBar,
    "simple-bar--animations-disabled": settings.global.disableAnimations,
    "simple-bar--spaces-background-color-as-foreground":
      settings.global.spacesBackgroundColorAsForeground,
    "simple-bar--widgets-background-color-as-foreground":
      settings.global.widgetsBackgroundColorAsForeground,
    "simple-bar--process-aligned-to-left": !settings.global.centered,
  });

  // Handle errors
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error in index.jsx", error);
    return <Error.Component type="error" classes={baseClasses} />;
  }
  // Übersicht may retain output across a source reload. Do not mount providers
  // with defaults before the new instance has loaded its preferences.
  if (!initializedSettings || !output) {
    return <Error.Component type="noOutput" classes={baseClasses} />;
  }

  // Cleanup the output data
  const cleanedUpOutput = output.trim();

  // Handle window-manager query failures
  if (cleanedUpOutput === "riftError") {
    return <Error.Component type={cleanedUpOutput} classes={baseClasses} />;
  }

  // Parse the output data
  let data;
  try {
    data = Rift.parseSnapshot(cleanedUpOutput);
  } catch {
    return <Error.Component type="noData" classes={baseClasses} />;
  }

  const { displays, spaces } = data;

  // Handle bar focus ring on click
  Utils.handleBarFocus();

  // Render the bar with appropriate components and data
  return (
    <SimpleBarContextProvider
      initialSettings={settings}
      displays={displays}
    >
      <div className={baseClasses}>
        <SideIcon.Component />
        <React.Suspense fallback={<React.Fragment />}>
          <WorkspaceContextProvider spaces={spaces}>
            <WorkspaceSpaces />
            <WorkspaceProcess />
          </WorkspaceContextProvider>
        </React.Suspense>
        <Settings.Wrapper />
        <div className="simple-bar__data">
          <UserWidgets />
          <Zoom.Widget />
          <GitHub.Widget />
          <Weather.Widget />
          <Netstats.Widget />
          <Cpu.Widget />
          <Memory.Widget />
          <Battery.Widget />
          <Notifications.Widget />
          <Mic.Widget />
          <Sound.Widget />
          <Wifi.Widget />
          <Keyboard.Widget />
          <DateDisplay.Widget />
          <Time.Widget />
        </div>
        <Missives.Component />
      </div>
    </SimpleBarContextProvider>
  );
}

export { command, refreshFrequency, render };
