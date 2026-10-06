import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";

const { React } = Uebersicht;

export default function WidgetStatus({ name, status, error, onRetry }) {
  return (
    <DataWidget.Widget
      classes="widget-status"
      status={status}
      title={error?.message || `${name} is unavailable`}
      onClick={onRetry}
    >
      {name}: {status === "unavailable" ? "unavailable" : "failed"}
    </DataWidget.Widget>
  );
}
