import { useState } from "react";
import TextAutocompleteInput from "@components/inputs/TextAutocompleteInput";
import Flag from "@components/panels/Flag";
import { LadingSymbol, isDangerousCargo } from "@components/panels/ShipInfoSymbols";
import {
  getStatusLevel,
  STATUS,
  StatusDots,
  TrackingSymbol,
} from "@utils/status";
import { getSectorEtaLabel } from "@utils/inboundEta";
import { SECTORS } from "@data/sectors";

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
  const sectorBoundary = activeSector ? SECTORS[activeSector]?.boundary : null;
  const etaLabel = getSectorEtaLabel(ship, sectorBoundary);
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

      <div className="panel-title ship-info-title">
        <h2 className="ship-info-name">{ship.name}</h2>
        {etaLabel && <p className="ship-info-eta"> - {etaLabel}</p>}
      </div>

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
            <StatusDots level={level} ariaLabel={`AIS status ${STATUS[level].label}`} />
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
