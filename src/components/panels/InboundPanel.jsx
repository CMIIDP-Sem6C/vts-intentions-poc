import { useMemo } from "react";
import {
  remainingRouteDistance,
  calculateETA,
  formatETA,
} from "../../utils/navigation";
import {
  getStatusLevel,
  STATUS_CSS,
  STATUS_COLORS,
  StatusStar,
} from "../../utils/status";

export default function InboundPanel({ ships, selectedShipId, onSelectShip }) {
  const inboundShips = useMemo(
    () =>
      ships.filter((s) => s.status === "inbound" || s.status === "in-sector"),
    [ships],
  );

  return (
    <div className="panel inbound-panel">
      <h2 className="panel-title">INBOUND VESSELS</h2>
      <table className="inbound-table">
        <thead>
          <tr>
            <th>NAAM</th>
            <th>ETA IN SECTOR</th>
            <th>BESTEMMING</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {inboundShips.map((ship) => {
            const eta = getShipETA(ship);
            const isSelected = ship.id === selectedShipId;
            const level = getStatusLevel(ship);

            return (
              <tr
                key={ship.id}
                className={`inbound-row status-${level} ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectShip(ship.id)}
              >
                <td className="ship-name-cell">{ship.name}</td>
                <td className="eta-cell">{eta}</td>
                <td className="destination-cell">
                  <span
                    className="dest-text"
                    style={{ color: STATUS_COLORS[level] }}
                  >
                    {ship.destination}
                  </span>
                </td>
                <td className="status-cell">
                  <StatusStar level={level} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getShipETA(ship) {
  if (ship.status === "in-sector") return "In sector";

  const remaining = remainingRouteDistance(
    ship.waypoints,
    ship.currentWaypointIndex,
    ship.position,
  );
  const etaSeconds = calculateETA(remaining, ship.speed);
  return formatETA(etaSeconds);
}
