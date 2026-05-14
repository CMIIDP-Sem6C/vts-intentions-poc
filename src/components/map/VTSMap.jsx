import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SECTORS, SECTOR_WATER_BOUNDARIES, WATERWAY_CENTERLINE, KM_MARKERS, TURNING_BASINS } from '../../data/sectors';
import { calculateDistance } from '../../utils/navigation';
import ShipMarker from './ShipMarker';
import 'leaflet/dist/leaflet.css';

function getRemainingIntentionRoute(route, shipPosition) {
  if (!Array.isArray(route) || route.length < 2) return [];
  if (!shipPosition) return route;

  let nearestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < route.length; i++) {
    const d = calculateDistance(shipPosition, route[i]);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }

  const remaining = route.slice(nearestIdx + 1);
  if (remaining.length === 0) return [];
  return [shipPosition, ...remaining];
}

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

const INTENTION_STYLE = {
  color: '#FFC107',
  weight: 3,
  opacity: 0.85,
  dashArray: '6 6',
};

export default function VTSMap({
  ships,
  selectedShipId,
  onSelectShip,
  activeSector,
  intentions = [],
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

      {intentions.map((intention) => {
        const ship = ships.find(
          (s) => s.dbId === intention.dbShipId || s.id === intention.shipId
        );
        const visibleRoute = getRemainingIntentionRoute(intention.route, ship?.position);
        if (visibleRoute.length < 2) return null;
        return (
          <Polyline
            key={`intention-${intention.id}`}
            positions={visibleRoute}
            pathOptions={INTENTION_STYLE}
          />
        );
      })}

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
