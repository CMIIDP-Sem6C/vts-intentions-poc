import { useState, useEffect } from "react";
import TextAutocompleteInput from "../inputs/TextAutocompleteInput";
import Flag from "./Flag";
import {
  getStatusLevel,
  STATUS_LABELS,
  STATUS_CSS,
  STATUS_COLORS,
} from "../../utils/status";

export default function ShipInfoCard({
  ship,
  onClose,
  onSetDestination,
  onVerifyShip,
  verificationError,
  destinations = [],
}) {
  const [editDest, setEditDest] = useState('');
  const [scanning, setScanning] = useState(false);
  if (!ship) return null;

  const level = getStatusLevel(ship);

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

      <h2 className="panel-title">SCHIP INFO - {ship.name}</h2>

      <div className="ship-info-actions">
        <button
          className={`scan-ais-btn ${scanning ? 'scanning' : ''} ${ship.verified ? 'active' : ''}`}
          onClick={handleScan}
          disabled={ship.verified}
        >
          {ship.verified
            ? 'SCHIP GEVERIFIEERD'
            : scanning
              ? 'VERIFIEREN...'
              : 'VERIFIEER SCHIP'}
        </button>
      </div>

      <div className="ship-info-body">
        <div className="ship-info-visual">
          <div className="ship-placeholder-img">
            <svg viewBox="0 0 120 60" width="100%" height="100%">
              <rect x="10" y="20" width="100" height="25" rx="4" fill="#555" />
              <polygon points="110,32 125,32 120,20 110,20" fill="#666" />
              <rect x="30" y="12" width="20" height="10" rx="2" fill="#444" />
              <line
                x1="40"
                y1="5"
                x2="40"
                y2="12"
                stroke="#777"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <button className="vhf-btn">CONTACT VIA VHF</button>

          {ship.nationality && (
            <div className="ship-flag-row">
              <Flag code={ship.nationality} />
              <button
                className="transcript-btn"
                onClick={() => {}}
                type="button"
              >
                TRANSCRIPT
              </button>
            </div>
          )}
        </div>

        <div className="ship-info-details">
          <div className="info-row">
            <span className="info-label">BESTEMMING</span>
            <TextAutocompleteInput
              value={ship.destination === "Unknown" ? "" : ship.destination}
              onSubmit={handleDestSubmit}
              suggestions={destinations}
              level={level}
              style={{ color: STATUS_COLORS[level] }}
              placeholder="Onbekend - voer in..."
            />
          </div>
          <div className="info-row">
            <span className="info-label">VERIFICATIE</span>
            <span className={`info-value ${STATUS_CSS[level]}`}>
              {ship.verified ? 'Geverifieerd' : 'Niet geverifieerd'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">TRACKING</span>
            <span className={`info-value ${STATUS_CSS[level]}`}>
              {STATUS_LABELS[level]}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">LADING</span>
            <span className="info-value">{ship.cargo}</span>
          </div>
          <div className="info-row">
            <span className="info-label">TYPE</span>
            <span className="info-value">{ship.shipType}</span>
          </div>

          {ship.operatorNotes && ship.operatorNotes.length > 0 && (
            <div className="operator-notes">
              <h3 className="notes-title">OPERATOR NOTITIES</h3>
              {ship.operatorNotes.map((note, i) => (
                <div key={i} className="note-entry">
                  <div className="note-header">
                    {note.channel} - {note.location} | {note.time}
                  </div>
                  <div className="note-text">{note.note}</div>
                </div>
              ))}
            </div>
          )}

          {verificationError && (
            <div className="operator-notes">
              <h3 className="notes-title">DATABASE FOUT</h3>
              <div className="note-entry">
                <div className="note-text">{verificationError}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
