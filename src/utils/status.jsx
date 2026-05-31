/**
 * Derive the verification status level for a ship.
 *
 * - "red"    → AIS off and/or no valid destination
 * - "yellow" → AIS on + destination known, but not verified
 * - "green"  → AIS on + destination known + verified
 *
 * @param {Ship} ship - Enriched ship object
 * @returns {StatusLevel}
 */
export function getStatusLevel(ship) {
  // if ais not active, and/or no (or unknown) destination => red
  if (!ship.aisActive) return "red";
  const dest = (ship.destination || "").toLowerCase();
  if (dest === "" || dest.toLowerCase() === "unknown") return "red";
  // if ais active and we have a destination (implied from previous checks), AND we have ship.verified = true => green
  if (ship.verified) return "green";
  // otherwise => yellow
  return "yellow";
}

/** @type {Record<<StatusLevel, { label: string, css: string, color: string, dots: number }>} */
export const STATUS = {
  red: {
    label: "Onbekend",
    css: "status-red",
    color: "#F44336",
    dots: 1,
  },
  yellow: {
    label: "Gedeeltelijk",
    css: "status-yellow",
    color: "#FF9800",
    dots: 2,
  },
  green: {
    label: "Volledig",
    css: "status-green",
    color: "#4CAF50",
    dots: 3,
  },
};

/**
 * Filled status dots for a level: red = 1, yellow = 2, green = 3.
 * The colour double-codes the level alongside the dot count.
 *
 * @param {{ level: StatusLevel, ariaLabel?: string }} props
 */
export function StatusDots({ level, ariaLabel }) {
  const { dots, color } = STATUS[level];
  return (
    <span className="status-dots" aria-label={ariaLabel}>
      {Array.from({ length: dots }).map((_, i) => (
        <span key={i} className="status-dot" style={{ background: color }} />
      ))}
    </span>
  );
}

/**
 * Tracking indicator with double coding (colour + shape):
 * - red    -> cross (no tracking)
 * - yellow -> dash  (partial tracking)
 * - green  -> check (full tracking)
 *
 * @param {{ level: StatusLevel }} props
 */
export function TrackingSymbol({ level }) {
  const color = STATUS[level].color;
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (level === "red") {
    return (
      <span className="tracking-symbol" title="Geen tracking">
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    );
  }
  if (level === "yellow") {
    return (
      <span className="tracking-symbol" title="Gedeeltelijke tracking">
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      </span>
    );
  }
  return (
    <span className="tracking-symbol" title="Volledige tracking">
      <svg {...common}>
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}
