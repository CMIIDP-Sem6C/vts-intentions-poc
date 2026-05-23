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
