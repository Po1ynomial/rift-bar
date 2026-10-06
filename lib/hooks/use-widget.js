import * as Uebersicht from "uebersicht";
import { createWidgetResource } from "../widgets/runtime.js";

const { React } = Uebersicht;

export default function useWidget(definition, active, config) {
  const [snapshot, setSnapshot] = React.useState({ status: "idle" });
  const resource = React.useRef();
  React.useEffect(() => {
    setSnapshot({ status: active ? "loading" : "idle" });
    if (!active) return;
    const current = createWidgetResource(definition, config, { onChange: setSnapshot });
    resource.current = current;
    current.refresh();
    return () => {
      current.stop();
      if (resource.current === current) resource.current = undefined;
    };
  }, [definition, active, config]);
  const refresh = React.useCallback(() => resource.current?.refresh({ force: true }), []);
  return { ...snapshot, refresh };
}
