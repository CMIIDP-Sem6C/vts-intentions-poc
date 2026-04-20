import { useMemo } from 'react';
import {
  remainingRouteDistance,
  calculateETA,
  formatETA,
} from '../../utils/navigation';
import { SECTOR_ENTRY_POINTS } from '../../data/sectors';

function StarIcon({ filled, onClick }) {
  return (
    <button
      className="star-btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={filled ? 'Geverifieerd' : 'Niet geverifieerd'}
    >
      {filled ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#C62828">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      )}
    </button>
  );
}

export default function InboundPanel({
  ships,
  selectedShipId,
  onSelectShip,
  onToggleVerified,
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
            <th>GEVERIFIEERD</th>
          </tr>
        </thead>
        <tbody>
          {inboundShips.map((ship) => {
            const eta = getShipETA(ship);
            const isSelected = ship.id === selectedShipId;

            return (
              <tr
                key={ship.id}
                className={`inbound-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectShip(ship.id)}
              >
                <td className="ship-name-cell">{ship.name}</td>
                <td className="eta-cell">{eta}</td>
                <td className="destination-cell">
                  <span className={ship.destination === 'Unknown' ? 'dest-unknown' : 'dest-known'}>
                    {ship.destination}
                  </span>
                </td>
                <td className="verified-cell">
                  <StarIcon
                    filled={ship.verified}
                    onClick={() => onToggleVerified(ship.id)}
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
