import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import { SECTOR_CENTER, SECTOR_ZOOM, SECTOR_BOUNDARY } from '../../data/sectors';
import ShipMarker from './ShipMarker';
import 'leaflet/dist/leaflet.css';

const SECTOR_STYLE = {
  color: '#FF5722',
  weight: 2,
  dashArray: '8 4',
  fillOpacity: 0.03,
};

export default function VTSMap({ ships, selectedShipId, onSelectShip }) {
  return (
    <MapContainer
      center={SECTOR_CENTER}
      zoom={SECTOR_ZOOM}
      className="vts-map"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polygon positions={SECTOR_BOUNDARY} pathOptions={SECTOR_STYLE} />

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
