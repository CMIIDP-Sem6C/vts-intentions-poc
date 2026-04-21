import { useMemo } from 'react';
import {
  remainingRouteDistance,
  calculateETA,
  formatETA,
} from '../../utils/navigation';

const STATUS_COLORS = {
  red: '#F44336',
  yellow: '#FF9800',
  green: '#4CAF50',
};

function getStatusLevel(ship) {
  if (ship.verified) return 'green';
  const destKnown = ship.destination && ship.destination !== 'Unknown';
  return destKnown ? 'yellow' : 'red';
}

function StatusStar({ level, verified, onToggle }) {
  const color = STATUS_COLORS[level];
  return (
    <button
      type="button"
      className={`verify-star-btn ${verified ? 'verified' : 'unverified'}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!verified);
      }}
      title={verified ? 'Unverify ship' : 'Verify ship'}
      aria-label={verified ? 'Unverify ship' : 'Verify ship'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
}

export default function InboundPanel({
  ships,
  selectedShipId,
  onSelectShip,
  onToggleShipVerification,
}) {
  const inboundShips = useMemo(
    () => ships.filter((s) => s.status === 'inbound' || s.status === 'in-sector'),
    [ships]
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
            <th>VER</th>
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
                className={`inbound-row status-${level} ${isSelected ? 'selected' : ''}`}
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
                  <StatusStar
                    level={level}
                    verified={Boolean(ship.verified)}
                    onToggle={(nextVerified) => onToggleShipVerification(ship.id, nextVerified)}
                  />
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
  if (ship.status === 'in-sector') return 'In sector';

  const remaining = remainingRouteDistance(
    ship.waypoints,
    ship.currentWaypointIndex,
    ship.position
  );
  const etaSeconds = calculateETA(remaining, ship.speed);
  return formatETA(etaSeconds);
}
