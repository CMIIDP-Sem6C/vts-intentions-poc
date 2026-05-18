export function getStatusLevel(ship) {
  const destKnown = ship.destination && ship.destination !== "Unknown";
  const isVerified = Boolean(ship.verified);
  if (destKnown && isVerified) return "green";
  if (destKnown || isVerified) return "yellow";
  return "red";
}

export const STATUS_LABELS = {
  red: "Onbekend",
  yellow: "Gedeeltelijk",
  green: "Volledig",
};

export const STATUS_CSS = {
  red: "status-red",
  yellow: "status-yellow",
  green: "status-ok",
};

export const STATUS_COLORS = {
  red: "#F44336",
  yellow: "#FF9800",
  green: "#4CAF50",
};

export const STATUS_DOT_COUNT = {
  red: 1,
  yellow: 2,
  green: 3,
};

export function StatusStar({ level }) {
  const color = STATUS_COLORS[level];
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}
