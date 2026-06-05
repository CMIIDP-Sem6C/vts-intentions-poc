/**
 * @typedef {Object} FlagDef
 * @property {string} label - Country name in Dutch
 * @property {[string, string, string]} stripes - Three stripe colors (top, middle, bottom)
 */

/** @type {Record<string, FlagDef>} */
const FLAGS = {
  DE: {
    label: "Duitsland",
    stripes: ["#000000", "#DD0000", "#FFCE00"],
  },
  NL: {
    label: "Nederland",
    stripes: ["#AE1C28", "#FFFFFF", "#21468B"],
  },
  BG: {
    label: "Bulgarije",
    stripes: ["#FFFFFF", "#00966E", "#D62612"],
  },
};
//TODO: Q: Waarom doen we vlaggen op deze manier? waarom geen SVG, of icons of iets?

/**
 * Renders a horizontal tri-stripe flag SVG for a given country code.
 *
 * @param {Object} props
 * @param {string} props.code - ISO country code (e.g. "DE", "NL", "BG")
 * @param {string} [props.className=''] - Additional CSS class
 * @param {React.CSSProperties} [props.style] - Inline styles
 * @returns {JSX.Element|null} The flag SVG, or null if the code is unknown
 */
export default function Flag({ code, className = "", style }) {
  const flag = FLAGS[code];
  if (!flag) return null;

  const [top, middle, bottom] = flag.stripes;

  return (
    <div
      className={`flag ${className}`.trim()}
      title={flag.label}
      style={style}
      aria-label={`Vlag ${flag.label}`}
    >
      <svg
        viewBox="0 0 60 40"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="60" height="13.333" fill={top} />
        <rect x="0" y="13.333" width="60" height="13.334" fill={middle} />
        <rect x="0" y="26.667" width="60" height="13.333" fill={bottom} />
      </svg>
    </div>
  );
}
