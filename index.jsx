import * as Uebersicht from "uebersicht";
import * as ErrorView from "./lib/components/error.jsx";
import SimpleBarContextProvider, {
  useSimpleBarContext,
} from "./lib/components/simple-bar-context.jsx";
import * as Variables from "./lib/styles/core/variables.js";
import * as Base from "./lib/styles/core/base.js";
import * as Spaces from "./lib/styles/components/spaces/spaces.js";
import * as Process from "./lib/styles/components/process.js";
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
import * as Missives from "./lib/components/missives/missives.jsx";
import * as Utils from "./lib/utils.js";
import * as Settings from "./lib/settings.js";
import * as Rift from "./lib/rift.js";
const { React } = Uebersicht;
const WorkspaceContextProvider = React.lazy(() => import("./lib/components/workspace-context.jsx"));
const WorkspaceSpaces = React.lazy(() => import("./lib/components/workspaces/spaces.jsx"));
const WorkspaceProcess = React.lazy(() => import("./lib/components/workspaces/process.jsx"));
export const refreshFrequency = false;
let initialization;
let initialized = false;
function initialize() {
  if (!initialization)
    initialization = Settings.init()
      .then((settings) => {
        Utils.injectStyles("simple-bar-index-styles", [
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
          Missives.styles,
        ]);
        Utils.injectStyles("rift-bar-config-styles", [Variables.buildStyles(settings)]);
        initialized = true;
      })
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  return initialization;
}
export async function command() {
  const started = initialized;
  await initialize();
  if (started && Settings.reloadRequested()) {
    try {
      await Settings.init();
    } catch {
      /* Keep the last valid configuration; the bar displays its error. */
    }
  }
  return Rift.getSnapshot();
}
export function barClasses(settings) {
  return Utils.classNames("simple-bar", {
    "simple-bar--floating": settings.bar.floating,
    "simple-bar--no-bar-background": !settings.bar.background,
    "simple-bar--no-bar-shadow": !settings.bar.shadow,
    "simple-bar--animations-disabled": !settings.appearance.animations,
    "simple-bar--process-aligned-to-left": !settings.process.centered,
  });
}
export function Bar({ spaces }) {
  const { settings, configError } = useSimpleBarContext();
  const ref = React.useRef();
  React.useEffect(() => Utils.handleBarFocus(ref.current), []);
  return (
    <div ref={ref} className={barClasses(settings)}>
      <Settings.Wrapper />
      <div className="simple-bar__foreground">
        <React.Suspense fallback={<React.Fragment />}>
          <WorkspaceContextProvider spaces={spaces}>
            <WorkspaceSpaces />
            <WorkspaceProcess />
          </WorkspaceContextProvider>
        </React.Suspense>
        {configError && (
          <span className="config-error" role="alert" title={configError.message}>
            Configuration: {configError.message}
          </span>
        )}
        <div className="simple-bar__data">
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
      </div>
      <Missives.Component />
    </div>
  );
}
export function render({ output, error }) {
  const classes = barClasses(Settings.get());
  if (error)
    return (
      <ErrorView.Component type="error" classes={classes} detail={error.message || String(error)} />
    );
  if (!initialized || !output) return <ErrorView.Component type="noOutput" classes={classes} />;
  if (output.trim() === "riftError")
    return <ErrorView.Component type="riftError" classes={classes} />;
  let snapshot;
  try {
    snapshot = Rift.parseSnapshot(output.trim());
  } catch {
    return <ErrorView.Component type="noData" classes={classes} />;
  }
  return (
    <SimpleBarContextProvider initialSettings={Settings.get()} displays={snapshot.displays}>
      <Bar spaces={snapshot.spaces} />
    </SimpleBarContextProvider>
  );
}
