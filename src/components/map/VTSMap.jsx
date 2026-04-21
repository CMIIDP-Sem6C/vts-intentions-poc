import { useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SECTORS, SECTOR_WATER_BOUNDARIES, WATERWAY_CENTERLINE, KM_MARKERS, TURNING_BASINS } from '../../data/sectors';
import { RADAR_CONTACTS } from '../../data/mockShips';
import ShipMarker from './ShipMarker';
import 'leaflet/dist/leaflet.css';

const ALL_SECTORS_BOUNDS = (() => {
  const allCoords = Object.values(SECTORS).flatMap((s) => s.boundary);
  const lats = allCoords.map((c) => c[0]);
  const lngs = allCoords.map((c) => c[1]);
  const pad = 0.02;
  return L.latLngBounds(
    [Math.min(...lats) - pad, Math.min(...lngs) - pad * 2],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad * 2]
  );
})();

function MapConstraints() {
  const map = useMap();
  useMemo(() => {
    map.setMaxBounds(ALL_SECTORS_BOUNDS.pad(0.5));
    map.setMinZoom(12);
    map.setMaxZoom(17);
  }, [map]);
  return null;
}

const SECTOR_BORDER_STYLE = {
  color: '#66BB6A',
  weight: 2,
  opacity: 0.8,
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
      <MapConstraints />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />

      {SECTOR_WATER_BOUNDARIES.map((b) => (
        <Polyline
          key={b.id}
          positions={b.line}
          pathOptions={SECTOR_BORDER_STYLE}
        />
      ))}

      <Polyline
        positions={WATERWAY_CENTERLINE}
        pathOptions={{
          color: '#5a5a5a',
          weight: 1,
          opacity: 0.5,
        }}
      />

      {KM_MARKERS.map((km) => (
        <CircleMarker
          key={km.id}
          center={km.position}
          radius={2}
          pathOptions={{ color: '#888', fillColor: '#888', fillOpacity: 1, weight: 0 }}
        >
          <Tooltip direction="top" offset={[0, -4]} permanent className="km-marker-tooltip">
            {km.label}
          </Tooltip>
        </CircleMarker>
      ))}

      {TURNING_BASINS.map((tb) => (
        <CircleMarker
          key={tb.id}
          center={tb.position}
          radius={8}
          pathOptions={{ color: '#607D8B', fillColor: 'transparent', fillOpacity: 0, weight: 1, opacity: 0.6 }}
        >
          <Tooltip direction="top" offset={[0, -8]} className="km-marker-tooltip">
            {tb.label}
          </Tooltip>
        </CircleMarker>
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
