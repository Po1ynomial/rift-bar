import * as Uebersicht from "uebersicht";
import * as Settings from "../settings.js";
import * as Utils from "../utils.js";
import { buildStyles } from "../styles/core/variables.js";
const { React } = Uebersicht;
const RiftBarContext = React.createContext({
  displayUuid: undefined,
  displays: [],
  settings: Settings.defaultSettings,
  missives: [],
  pushMissive: () => {},
});
export const useRiftBarContext = () => React.useContext(RiftBarContext);

export default function RiftBarContextProvider({ initialSettings, displays, children }) {
  const [config, setConfig] = React.useState(() => ({
    ...Settings.getState(),
    settings: initialSettings,
  }));
  const [missives, setMissives] = React.useState([]);
  const timers = React.useRef(new Set());
  const counter = React.useRef(0);
  React.useEffect(() => Settings.subscribe(setConfig), []);
  React.useEffect(() => {
    Utils.injectStyles("rift-bar-config-styles", [buildStyles(config.settings)]);
  }, [config.settings, config.paletteStamp]);
  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);
  const screenId = parseInt(window.location.pathname.replace("/", ""), 10);
  const display = displays.find((item) => item.id === screenId);
  const pushMissive = (missive) => {
    const id = ++counter.current;
    const { content, side = "right", delay = 5000 } = missive;
    let timeout;
    if (delay > 0) {
      timeout = setTimeout(() => {
        timers.current.delete(timeout);
        setMissives((current) => current.filter((item) => item.id !== id));
      }, delay);
      timers.current.add(timeout);
    }
    setMissives((current) => [...current, { id, content, side, timeout }]);
  };
  return (
    <RiftBarContext.Provider
      value={{
        settings: config.settings,
        configError: config.error,
        displayUuid: display?.uuid,
        displayIndex: display?.index,
        displays,
        missives,
        setMissives,
        pushMissive,
      }}
    >
      {children}
    </RiftBarContext.Provider>
  );
}
