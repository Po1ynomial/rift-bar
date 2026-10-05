import * as Uebersicht from "uebersicht";
import { useSimpleBarContext } from "./simple-bar-context.jsx";
import useServerSocket from "../hooks/use-server-socket.js";
import * as Aerospace from "../aerospace.js";

const { React } = Uebersicht;

// Create a context with default values
const AerospaceContext = React.createContext({
  spaces: [],
  windows: [],
  mode: "",
});

/**
 * Custom hook to use the AerospaceContext
 * @returns {Object} The context value
 */
export function useAerospaceContext() {
  return React.useContext(AerospaceContext);
}

// Memoized AerospaceContextProvider component
export default React.memo(AerospaceContextProvider);

/**
 * AerospaceContextProvider component
 * @param {Object} props - The component props
 * @param {React.ReactNode} props.children - The child components
 * @returns {JSX.Element} The provider component
 */
function AerospaceContextProvider({ children, spaces: snapshotSpaces = [] }) {
  // Get settings, displayIndex, and displays from SimpleBarContext
  const { settings, displayIndex, displays } = useSimpleBarContext();
  const { windowManager, enableServer, aerospaceServerRefresh } = settings.global;
  const isRift = windowManager === "rift";
  const serverEnabled = !isRift && enableServer && aerospaceServerRefresh;

  // State to store aerospace spaces
  const [aerospaceSpaces, setAerospaceSpaces] = React.useState([]);
  const latestRequestRef = React.useRef(0);

  // Fetches and sets the aerospace spaces
  const getSpaces = React.useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    let focusedWindow = {};
    const [focusedSpace] = await Aerospace.getFocusedSpace();
    try {
      [focusedWindow] = await Aerospace.getFocusedWindow();
      // eslint-disable-next-line no-empty
    } catch {}
    const spaces = await Promise.all(
      displays.map(async (display) => {
        const id = display["monitor-id"];
        const result = await Aerospace.getSpaces(id);
        return Promise.all(
          result.map(async (space) => {
            const focused = space.workspace === focusedSpace.workspace;
            const monitor = Aerospace.getDisplayIndex(space);
            const windows = await Aerospace.getWindows(space.workspace);
            const formatted = windows.map((window) => {
              const focused =
                window["window-id"] === focusedWindow["window-id"];
              return {
                ...window,
                focused,
              };
            });
            return { ...space, windows: formatted, focused, monitor };
          })
        );
      })
    );
    if (requestId !== latestRequestRef.current) {
      return;
    }
    setAerospaceSpaces(spaces.flat());
  }, [displays]);

  // Refreshes spaces with the data sent by simple-bar-server if it exists
  // in order to speed up the process then refreshes everything in background
  // else, simply refreshes everything
  const refreshSpaces = React.useCallback(
    async (data) => {
      if (data) {
        const { space } = data;
        setAerospaceSpaces((current) => {
          return current.map((s) => ({ ...s, focused: s.workspace === space }));
        });
        getSpaces();
      } else {
        await getSpaces();
      }
    },
    [getSpaces]
  );

  // Resets the aerospace spaces state
  const resetSpaces = () => {
    setAerospaceSpaces([]);
  };

  // Use server socket to fetch and reset spaces
  useServerSocket("spaces", serverEnabled, refreshSpaces, resetSpaces);

  // Fetch spaces on component mount and when displayIndex changes
  React.useEffect(() => {
    if (!isRift) refreshSpaces();
  }, [refreshSpaces, displayIndex, isRift]);

  // Rift snapshots arrive through Übersicht's command refresh. The normalized
  // data uses the same workspace/window fields as the AeroSpace components.
  return (
    <AerospaceContext.Provider
      value={{ spaces: isRift ? snapshotSpaces : aerospaceSpaces }}
    >
      {children}
    </AerospaceContext.Provider>
  );
}
