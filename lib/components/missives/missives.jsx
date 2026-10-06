import * as Uebersicht from "uebersicht";
import { useSimpleBarContext } from "../rift-bar-context.jsx";
import Missive from "./missive.jsx";

export { missivesStyles as styles } from "../../styles/components/missives";

const { React } = Uebersicht;

/**
 * Component to display a list of missives.
 * It uses the simple-bar context to get settings and missives data.
 *
 * @returns {JSX.Element} The rendered component.
 */
export function Component() {
  const { missives } = useSimpleBarContext();

  return (
    <div className="missives">
      {missives.map(({ id, side, content, timeout }) => {
        return <Missive key={id} id={id} side={side} content={content} timeout={timeout} />;
      })}
    </div>
  );
}
