import * as Uebersicht from "uebersicht";

const { React } = Uebersicht;

const SimpleBarContext = React.createContext({
  displayIndex: 1,
  displays: [],
  settings: {},
  setSettings: () => {},
});

export function useSimpleBarContext() {
  return React.useContext(SimpleBarContext);
}

export default function SimpleBarContextProvider({
  initialSettings,
  displays,
  children,
}) {
  const [settings, setSettings] = React.useState(initialSettings);
  const [missives, setMissives] = React.useState([]);
  const ubersichtDisplayId = parseInt(
    window.location.pathname.replace("/", ""),
    10,
  );

  // Rift's screen IDs match Übersicht's screen IDs directly.
  const currentDisplay =
    displays?.find((display) => display.id === ubersichtDisplayId) || {};
  const displayIndex = currentDisplay.index ?? 1;

  const pushMissive = (newMissive) => {
    const now = Date.now();
    const { content, side = "right", delay = 5000 } = newMissive;
    const timeout =
      typeof delay === "number" && delay !== 0
        ? setTimeout(() => {
            setMissives((current) => current.filter((m) => m.id !== now));
          }, delay)
        : undefined;
    setMissives((current) => [...current, { id: now, content, side, timeout }]);
  };

  return (
    <SimpleBarContext.Provider
      value={{
        displayIndex,
        settings,
        setSettings,
        displays,
        missives,
        setMissives,
        pushMissive,
      }}
    >
      {children}
    </SimpleBarContext.Provider>
  );
}
