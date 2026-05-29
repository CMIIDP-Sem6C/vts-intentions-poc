import { SECTORS } from "@data/sectors";

/**
 * Sector selection screen. Presents available sectors as buttons.
 *
 * @param {Object} props
 * @param {(sectorKey: string) => void} props.onSelect - Called when a sector is chosen
 */
export default function SectorSelect({ onSelect }) {
  return (
    <div className="sector-select-overlay">
      <div className="sector-select-card">
        <h1 className="sector-select-title">VTS ROTTERDAM</h1>
        <p className="sector-select-subtitle">Selecteer uw sector</p>

        <div className="sector-select-buttons">
          {Object.entries(SECTORS).map(([key, sector]) => (
            <button
              key={key}
              className="sector-select-btn"
              onClick={() => onSelect(key)}
            >
              <span className="sector-btn-name">{sector.name}</span>
              <span className="sector-btn-vhf">VHF {sector.vhfChannel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
