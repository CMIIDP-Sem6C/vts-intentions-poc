import { DANGEROUS_CARGO_KEYWORDS } from "@config/cargo";

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
