import * as Uebersicht from "uebersicht";
import { iconForApp } from "../../app-icons.js";
import Icon from "../icons/icon.jsx";
import * as Utils from "../../utils.js";

const { React } = Uebersicht;

/**
 * OpenedApps component to display icons of opened applications.
 * @param {Object} props - The component props.
 * @param {Array} props.apps - The list of opened applications.
 * @returns {JSX.Element|null} The rendered component or null if no apps are opened.
 */
export default function OpenedApps({ apps }) {
  if (!apps.length) return null;

  return apps.map((app, i) => {
    const { focused } = app;
    const iconName = iconForApp(app["app-name"]);

    // Generate class names for the app icon
    const classes = Utils.classNames("space__icon", {
      "space__icon--focused": focused,
    });

    return <Icon key={i} name={iconName} className={classes} />;
  });
}
