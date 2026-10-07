import * as Uebersicht from "uebersicht";
import { catalog, resolveIcon } from "./catalog.js";

const { React } = Uebersicht;

// Every catalog asset becomes a lazy component once at module load, mirroring
// how the icon library was wired before the catalog refactor.
const assets = Object.fromEntries(
  Object.entries(catalog).map(([name, load]) => [name, React.lazy(load)]),
);

/**
 * Icon renders an SVG.
 *
 * With a `name` it resolves an asset from the consumer-independent catalog,
 * lazily loading it behind Suspense and falling back to the default icon when
 * the name is unknown. Without a `name` it renders its children inside an SVG
 * with the given viewBox, which is how library assets compose glyphs.
 *
 * @param {Object} props - The properties object.
 * @param {string} [props.name] - Catalog identifier of the icon to render.
 * @param {string} [props.fallback] - Catalog identifier used when `name` is unknown.
 * @param {number} [props.width=24] - The width of the SVG.
 * @param {number} [props.height=24] - The height of the SVG.
 * @param {React.ReactNode} props.children - Glyph paths, when no `name` is given.
 * @returns {JSX.Element} The SVG element.
 */
export default function Icon({ name, fallback, width = 24, height = 24, children, ...props }) {
  if (name === undefined) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} {...props}>
        {children}
      </svg>
    );
  }
  const Asset = assets[resolveIcon(name, fallback)];
  return (
    <React.Suspense fallback={<svg className="rift-bar-icon-loader" {...props} />}>
      <Asset {...props} />
    </React.Suspense>
  );
}
