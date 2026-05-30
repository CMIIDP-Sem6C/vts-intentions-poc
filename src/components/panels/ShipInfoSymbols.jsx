import { STATUS } from "@utils/status";

/**
 * AIS status indicator: filled dots matching the inbound list logic.
 * red = 1 dot, yellow = 2 dots, green = 3 dots (color double-codes the level).
 *
 * @param {{ level: StatusLevel }} props
 */
export function AisStatusDots({ level }) {
  const { dots, color } = STATUS[level];
  return (
    <span className="status-dots" aria-label={`AIS status ${STATUS[level].label}`}>
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

const DANGEROUS_CARGO_KEYWORDS = [
  "gevaarlijk",
  "hazard",
  "chemical",
  "chemicali",
  "olie",
  "oil",
  "benzine",
  "diesel",
  "brandstof",
  "fuel",
  "gas",
  "lng",
  "lpg",
  "ammonia",
  "explos",
  "radioact",
  "zuur",
  "acid",
  "toxic",
  "giftig",
];

/**
 * Determine whether a cargo description denotes dangerous goods.
 * @param {string|null|undefined} cargo
 * @returns {boolean}
 */
export function isDangerousCargo(cargo) {
  if (!cargo) return false;
  const c = cargo.toLowerCase();
  return DANGEROUS_CARGO_KEYWORDS.some((kw) => c.includes(kw));
}

/**
 * Cargo indicator with double coding (colour + shape):
 * - dangerous goods present -> orange warning triangle with "!"
 * - no dangerous goods      -> green check inside a circle
 *
 * @param {{ dangerous: boolean }} props
 */
export function LadingSymbol({ dangerous }) {
  if (dangerous) {
    return (
      <span
        className="lading-symbol lading-danger"
        title="Gevaarlijke stoffen aan boord"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3L1.5 21h21L12 3z"
            fill="none"
            stroke="#FF9800"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M12 9v5"
            stroke="#FF9800"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17.5" r="1.2" fill="#FF9800" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="lading-symbol lading-safe"
      title="Geen gevaarlijke stoffen aan boord"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="#4CAF50"
          strokeWidth="2.2"
        />
        <path
          d="M8 12.5l2.5 2.5L16 9"
          fill="none"
          stroke="#4CAF50"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
