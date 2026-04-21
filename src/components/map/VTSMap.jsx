import { useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { SECTORS } from '../../data/sectors';
import { RADAR_CONTACTS } from '../../data/mockShips';
import ShipMarker from './ShipMarker';
import 'leaflet/dist/leaflet.css';

const ACTIVE_SECTOR_STYLE = {
  color: '#FF9800',
  weight: 2.5,
  dashArray: '8 4',
  fillOpacity: 0.05,
  fillColor: '#FF9800',
};

const INACTIVE_SECTOR_STYLE = {
  color: '#78909C',
  weight: 1.5,
  dashArray: '6 6',
  fillOpacity: 0.02,
  fillColor: '#607D8B',
};

const RADAR_STYLE = {
  color: '#1B5E20',
  fillColor: '#2E7D32',
  fillOpacity: 0.85,
  weight: 1,
};

const MOORED_CONFIGS = {
  small:  { size: 20, path: 'M 3,7.5 L 13,7.5 Q 17,10 13,12.5 L 3,12.5 Z' },
  medium: { size: 28, path: 'M 4,11 L 20,11 Q 25,14 20,17 L 4,17 Z' },
  large:  { size: 36, path: 'M 4,14.5 L 28,14.5 Q 33,18 28,21.5 L 4,21.5 Z' },
};

function createMooredIcon(heading, size, isSelected) {
  const cfg = MOORED_CONFIGS[size] || MOORED_CONFIGS.medium;
  const half = cfg.size / 2;
  const fill = isSelected ? '#2E7D32' : '#1B5E20';
  const stroke = isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.35)';
  const sw = isSelected ? 1.5 : 0.5;
  const svg = `<svg width="${cfg.size}" height="${cfg.size}" viewBox="0 0 ${cfg.size} ${cfg.size}" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(${heading}, ${half}, ${half})"><path d="${cfg.path}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></g></svg>`;
  return L.divIcon({
    html: svg,
    className: 'ship-icon',
    iconSize: [cfg.size, cfg.size],
    iconAnchor: [half, half],
  });
}

function MooredShipMarker({ ship, isSelected, onSelect, onUpdate }) {
  const handleDragEnd = useCallback((e) => {
    const { lat, lng } = e.target.getLatLng();
    onUpdate(ship.id, { position: [lat, lng] });
  }, [ship.id, onUpdate]);

  const rotate = useCallback((delta) => {
    onUpdate(ship.id, { heading: ((ship.heading + delta) % 360 + 360) % 360 });
  }, [ship.id, ship.heading, onUpdate]);

  return (
    <Marker
      position={ship.position}
      icon={createMooredIcon(ship.heading, ship.size, isSelected)}
      draggable={isSelected}
      eventHandlers={{
        click: () => onSelect(ship.id),
        dragend: handleDragEnd,
      }}
    >
      {isSelected && (
        <Popup
          offset={[0, -10]}
          closeButton={false}
          className="moored-popup"
          autoPan={false}
        >
          <div className="moored-controls">
            <span className="moored-label">AFGEMEERD SCHIP</span>
            <div className="moored-heading-row">
              <button className="rotate-btn" onClick={() => rotate(-15)}>-15</button>
              <button className="rotate-btn" onClick={() => rotate(-5)}>-5</button>
              <span className="heading-display">{Math.round(ship.heading)}</span>
              <button className="rotate-btn" onClick={() => rotate(5)}>+5</button>
              <button className="rotate-btn" onClick={() => rotate(15)}>+15</button>
            </div>
            <span className="moored-hint">Versleep om te verplaatsen</span>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export default function VTSMap({
  ships,
  selectedShipId,
  onSelectShip,
  mooredShips,
  selectedMooredId,
  onSelectMoored,
  onUpdateMoored,
  activeSector,
}) {
  const active = SECTORS[activeSector];

  return (
    <MapContainer
      center={active.center}
      zoom={active.zoom}
      className="vts-map"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {Object.entries(SECTORS).map(([key, sector]) => (
        <Polygon
          key={key}
          positions={sector.boundary}
          pathOptions={key === activeSector ? ACTIVE_SECTOR_STYLE : INACTIVE_SECTOR_STYLE}
        />
      ))}

      {RADAR_CONTACTS.map((rc) => (
        <CircleMarker
          key={rc.id}
          center={rc.position}
          radius={3}
          pathOptions={RADAR_STYLE}
        />
      ))}

      {mooredShips && mooredShips.map((ms) => (
        <MooredShipMarker
          key={ms.id}
          ship={ms}
          isSelected={ms.id === selectedMooredId}
          onSelect={onSelectMoored}
          onUpdate={onUpdateMoored}
        />
      ))}

      {ships.map((ship) => (
        <ShipMarker
          key={ship.id}
          ship={ship}
          isSelected={ship.id === selectedShipId}
          onSelect={onSelectShip}
        />
      ))}
    </MapContainer>
  );
}
