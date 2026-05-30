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
