import * as Uebersicht from "uebersicht";

const { React } = Uebersicht;
const WorkspaceContext = React.createContext({ spaces: [] });

export function useWorkspaceContext() {
  return React.useContext(WorkspaceContext);
}

function WorkspaceContextProvider({ children, spaces = [] }) {
  return (
    <WorkspaceContext.Provider value={{ spaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export default React.memo(WorkspaceContextProvider);
