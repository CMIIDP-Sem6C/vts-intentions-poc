import { useMemo } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getCourseVectorEnd } from '../../utils/navigation';

const VECTOR_LENGTH_NM = 1.0;

function createShipIcon(heading, color, isSelected) {
  const size = isSelected ? 72 : 64;
  const stroke = isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.7)';
  const strokeW = isSelected ? 2.5 : 1.5;
  const shadow = isSelected
    ? '<ellipse cx="30" cy="30" rx="18" ry="8" fill="rgba(255,255,255,0.15)" transform="rotate(' + heading + ', 30, 30)"/>'
    : '';

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      ${shadow}
      <g transform="rotate(${heading}, 30, 30)">
        <path
          d="M 30,6 L 40,18 L 40,46 L 38,50 L 22,50 L 20,46 L 20,18 Z"
          fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"
          stroke-linejoin="round"
        />
        <rect x="23" y="24" width="14" height="10" rx="1.5"
              fill="rgba(0,0,0,0.25)" />
        <rect x="26" y="36" width="8" height="6" rx="1"
              fill="rgba(0,0,0,0.15)" />
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'ship-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ShipMarker({ ship, isSelected, onSelect }) {
  const headingRounded = Math.round(ship.heading);

  const icon = useMemo(
    () => createShipIcon(headingRounded, ship.color, isSelected),
    [headingRounded, ship.color, isSelected]
  );

  const vectorEnd = useMemo(
    () => getCourseVectorEnd(ship.position, ship.heading, VECTOR_LENGTH_NM),
    [ship.position, ship.heading]
  );

  return (
    <>
      <Polyline
        positions={[ship.position, vectorEnd]}
        pathOptions={{
          color: ship.color,
          weight: 4,
          opacity: 0.85,
        }}
      />

      <Marker
        position={ship.position}
        icon={icon}
        eventHandlers={{
          click: () => onSelect(ship.id),
        }}
      >
        <Tooltip
          direction="top"
          offset={[0, -14]}
          permanent
          className="ship-name-tooltip"
        >
          {ship.name}
        </Tooltip>
      </Marker>
    </>
  );
}
