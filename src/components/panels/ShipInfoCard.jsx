export default function ShipInfoCard({ ship, onClose }) {
  if (!ship) return null;

  return (
    <div className="panel ship-info-card">
      <button className="close-btn" onClick={onClose} title="Sluiten">
        X
      </button>

      <h2 className="panel-title">SCHIP INFO - {ship.name}</h2>

      <div className="ship-info-body">
        <div className="ship-info-visual">
          <div className="ship-placeholder-img">
            <svg viewBox="0 0 120 60" width="100%" height="100%">
              <rect x="10" y="20" width="100" height="25" rx="4" fill="#555" />
              <polygon points="110,32 125,32 120,20 110,20" fill="#666" />
              <rect x="30" y="12" width="20" height="10" rx="2" fill="#444" />
              <line x1="40" y1="5" x2="40" y2="12" stroke="#777" strokeWidth="1.5" />
            </svg>
          </div>
          <button className="vhf-btn">CONTACT WITH VHF</button>
        </div>

        <div className="ship-info-details">
          <div className="info-row">
            <span className="info-label">BESTEMMING</span>
            <span className={`info-value ${ship.destination === 'Unknown' ? 'dest-unknown' : 'dest-known'}`}>
              {ship.destination}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">AIS / VDES STATUS</span>
            <span className={`info-value ${ship.verified ? 'status-ok' : 'status-warn'}`}>
              {ship.aisStatus}
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
        </div>
      </div>
    </div>
  );
}
