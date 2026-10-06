import * as Uebersicht from "uebersicht";
import * as Settings from "./settings/settings.jsx";
import * as Utils from "../utils";

const { React } = Uebersicht;

// Error messages for different types of errors
const message = {
  error: "Something went wrong…",
  riftError: "Cannot query Rift. Check rift-cli, jq, and that Rift is running.",
  noOutput: "Loading…",
  noData: "JSON error…",
};

/**
 * Component to display error messages based on the type of error.
 * @param {Object} props - The properties object.
 * @param {string} props.type - The type of error.
 * @param {string} props.classes - Additional CSS classes.
 * @returns {JSX.Element} The error component.
 */
export function Component({ type, classes }) {
  // Combine base class with additional classes and conditional loading class
  const errorClasses = Utils.classNames("simple-bar--empty", classes, {
    "simple-bar--loading": type === "noOutput",
  });

  // Retry failures without polling during normal operation. An effect owns the
  // timer so repeated renders cannot accumulate retries after recovery.
  React.useEffect(() => {
    const delay =
      type === "riftError" ? 15000 : type === "error" || type === "noData" ? 2000 : undefined;
    if (delay === undefined) return;
    let active = true;
    let timer;
    const retry = async () => {
      try {
        await Utils.softRefresh();
      } catch {
        // Übersicht may also be restarting. Keep the error-only retry alive.
      }
      if (active) timer = setTimeout(retry, delay);
    };
    timer = setTimeout(retry, delay);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [type]);

  return (
    <div className={errorClasses}>
      <span>simple-bar-index.jsx: {message[type]}</span>
      <Settings.Wrapper />
    </div>
  );
}
