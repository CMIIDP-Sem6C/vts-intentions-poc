import { useState } from "react";
import TextAutocompleteInput from "@components/inputs/TextAutocompleteInput";
import Flag from "@components/panels/Flag";
import {
  AisStatusDots,
  TrackingSymbol,
  LadingSymbol,
  isDangerousCargo,
} from "@components/panels/ShipInfoSymbols";
import { getStatusLevel, STATUS } from "@utils/status";
import {
  calculateDistance,
  calculateETA,
  formatETA,
  pointInPolygon,
} from "@utils/navigation";
import { SECTORS } from "@data/sectors";

/**
 * Distance from a ship's current position to the sector boundary along its
 * remaining route, mirroring the inbound panel logic.
 *
 * @param {Ship} ship
 * @param {import('../types').Coordinates[]} sectorBoundary
 * @returns {number|null} Distance in nautical miles, or null if not entering sector
 */
function computeDistanceToSector(ship, sectorBoundary) {
  if (!ship.waypoints || ship.currentWaypointIndex == null) return null;
  let dist = calculateDistance(
    ship.position,
    ship.waypoints[ship.currentWaypointIndex],
  );
  for (let i = ship.currentWaypointIndex; i < ship.waypoints.length; i++) {
    if (pointInPolygon(ship.waypoints[i], sectorBoundary)) return dist;
    if (i < ship.waypoints.length - 1) {
      dist += calculateDistance(ship.waypoints[i], ship.waypoints[i + 1]);
    }
  }
  return null;
}

/**
 * Compute the ETA-in-sector label shown next to the ship name in the header.
 * @param {Ship} ship
 * @param {string} activeSector
 * @returns {string|null}
 */
function getEtaLabel(ship, activeSector) {
  const boundary = activeSector ? SECTORS[activeSector]?.boundary : null;
  if (!boundary) return null;
  if (pointInPolygon(ship.position, boundary)) return "In sector";
  const dist = computeDistanceToSector(ship, boundary);
  if (dist == null) return null;
  return formatETA(calculateETA(dist, ship.speed));
}

/**
 * Detail panel showing ship information, verification controls, and operator notes.
 *
 * @param {Object} props
 * @param {Ship|null} props.ship - The selected ship, or null if none selected
 * @param {string} [props.activeSector] - Active sector key (for ETA in header)
 * @param {() => void} props.onClose - Close the panel
 * @param {(id: number, destination: string) => void} props.onSetDestination - Set destination callback
 * @param {(id: number) => void} props.onVerifyShip - Verify ship callback
 * @param {(id: number) => void} [props.onResetShip] - Reset ship to red status callback
 * @param {string|null} props.verificationError - Last verification error message
 * @param {DestinationSuggestion[]} [props.destinations=[]] - Destination autocomplete suggestions
 */
export default function ShipInfoCard({
  ship,
  activeSector,
  onClose,
  onSetDestination,
  onVerifyShip,
  onResetShip,
  verificationError,
  destinations = [],
}) {
  const [scanning, setScanning] = useState(false);
  if (!ship) return null;

  /** @type {StatusLevel} */
  const level = getStatusLevel(ship);
  const etaLabel = getEtaLabel(ship, activeSector);
  const dangerous =
    typeof ship.dangerousCargo === "boolean"
      ? ship.dangerousCargo
      : isDangerousCargo(ship.cargo);

  const handleDestSubmit = (newValue) => {
    if (newValue !== ship.destination) {
      onSetDestination(ship.id, newValue);
    }
  };

  const handleScan = () => {
    if (ship.verified || scanning) return;
    setScanning(true);
    setTimeout(() => {
      onVerifyShip(ship.id);
      setScanning(false);
    }, 1800);
  };

  return (
    <div className="panel ship-info-card">
      <button className="close-btn" onClick={onClose} title="Sluiten">
        X
      </button>

      <h2 className="panel-title ship-info-title">
        <span className="ship-info-name">{ship.name}</span>
        {etaLabel && <span className="ship-info-eta"> - {etaLabel}</span>}
      </h2>

      <div className="ship-info-actions">
        <button
          className={`scan-ais-btn ${scanning ? "scanning" : ""} ${ship.verified ? "active" : ""}`}
          onClick={handleScan}
          disabled={ship.verified}
        >
          {ship.verified
            ? "SCHIP GEVERIFIEERD"
            : scanning
              ? "VERIFIEREN..."
              : "VERIFIEER SCHIP"}
        </button>
      </div>

      <div className="ship-info-details">
        <div className="info-row">
          <span className="info-label">BESTEMMING</span>
          <TextAutocompleteInput
            value={ship.destination === "Unknown" ? "" : ship.destination}
            onSubmit={handleDestSubmit}
            suggestions={destinations}
            level={level}
            style={{ color: STATUS[level].color }}
            placeholder="Onbekend - voer in..."
          />
        </div>

        <div className="info-row">
          <span className="info-label">AIS STATUS</span>
          <span className="info-value info-symbol">
            <AisStatusDots level={level} />
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">TRACKING</span>
          <span className="info-value info-symbol">
            <TrackingSymbol level={level} />
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">LADING</span>
          <span className="info-value info-symbol">
            <LadingSymbol dangerous={dangerous} />
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">TYPE</span>
          <span className="info-value">{ship.shipType}</span>
        </div>

        <div className="info-row">
          <span className="info-label">TAAL</span>
          <span className="info-value info-taal">
            {ship.nationality && <Flag code={ship.nationality} />}
            <span>{(ship.nationality || "-").toUpperCase()}</span>
          </span>
        </div>

        {verificationError && (
          <div className="ship-info-error">
            <span className="info-label">DATABASE FOUT</span>
            <span className="note-text">{verificationError}</span>
          </div>
        )}
      </div>

      {onResetShip && (
        <button
          className="reset-test-btn"
          onClick={() => onResetShip(ship.id)}
          type="button"
          title="Zet dit schip terug naar rode status (testknop)"
        >
          reset status (test)
        </button>
      )}
    </div>
  );
}
