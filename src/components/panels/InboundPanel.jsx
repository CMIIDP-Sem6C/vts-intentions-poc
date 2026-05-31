import { useMemo, useState } from "react";
import { pointInPolygon } from "@utils/navigation";
import { getSectorEtaLabel } from "@utils/inboundEta";
import { StatusDots, STATUS } from "@utils/status";
import { SECTORS } from "@data/sectors";

/**
 * Panel listing inbound ships for the active sector.
 *
 * @param {Object} props
 * @param {Ship[]} props.ships - Enriched ships
 * @param {number|null} props.selectedShipId - Currently selected ship id
 * @param {(id: number) => void} props.onSelectShip - Ship selection callback
 * @param {(id: number, verified: boolean) => void} props.onToggleShipVerification - Verification toggle callback
 * @param {string} props.activeSector - Active sector key
 */
export default function InboundPanel({
  ships,
  selectedShipId,
  onSelectShip,
  onToggleShipVerification,
  activeSector,
}) {
  const [minimized, setMinimized] = useState(false);
  const sectorBoundary = activeSector ? SECTORS[activeSector]?.boundary : null;

  /** @type {InboundShip[]} */
  const inboundShips = useMemo(() => {
    if (!sectorBoundary) return [];

    return ships
      .filter((s) => !s.arrived)
      .map((s) => {
        const currentlyInSector = pointInPolygon(s.position, sectorBoundary);
        const routeEntersSector =
          !currentlyInSector &&
          s.waypoints?.some(
            (wp, i) =>
              i >= (s.currentWaypointIndex || 0) &&
              pointInPolygon(wp, sectorBoundary),
          );
        return { ...s, currentlyInSector, routeEntersSector };
      })
      .filter((s) => s.currentlyInSector || s.routeEntersSector);
  }, [ships, sectorBoundary]);

  if (minimized) {
    return (
      <button
        className="panel inbound-panel-toggle"
        onClick={() => setMinimized(false)}
        title="Toon inbound vessels"
      >
        INBOUND ({inboundShips.length})
      </button>
    );
  }

  return (
    <div className="panel inbound-panel">
      <button
        className="inbound-minimize-btn"
        onClick={() => setMinimized(true)}
        title="Verberg panel"
      >
        -
      </button>
      <table className="inbound-table">
        <thead>
          <tr>
            <th>SCHIP</th>
            <th>STATUS</th>
            <th>BESTEMMING</th>
            <th>ETA IN SECTOR</th>
          </tr>
        </thead>
        <tbody>
          {inboundShips.map((ship) => {
            const isSelected = ship.id === selectedShipId;
            const destKnown =
              ship.destination && ship.destination !== "Unknown";

            const eta = getSectorEtaLabel(ship, sectorBoundary, "Unknown");

            return (
              <tr
                key={ship.id}
                className={`inbound-row ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectShip(ship.id)}
              >
                <td className="ship-name-cell">{ship.name}</td>
                <td className="status-cell">
                  <StatusDots level={ship.status} />
                </td>
                <td className="destination-cell">
                  <span
                    className="dest-text"
                    style={{
                      color: destKnown ? "#bbb" : STATUS["red"].color,
                      fontStyle: destKnown ? "normal" : "italic",
                    }}
                  >
                    {destKnown ? ship.destination : "unknown"}
                  </span>
                </td>
                <td className="status-cell">{eta}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
