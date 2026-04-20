import { useMemo, useState, useCallback } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const FILL = '#1B5E20';
const FILL_SEL = '#2E7D32';
const ROUTE_COLOR = '#E57373';

function createTriangleIcon(heading, isSelected) {
  const size = isSelected ? 20 : 16;
  const half = size / 2;
  const fill = isSelected ? FILL_SEL : FILL;
  const stroke = isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.5)';
  const sw = isSelected ? 1.5 : 0.6;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${heading}, 9, 9)">
      <path d="M 9,2 C 11.5,5 14,10 13.5,14 C 13,15.5 11,14.5 9,12.5
               C 7,14.5 5,15.5 4.5,14 C 4,10 6.5,5 9,2 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    </g></svg>`;

  return L.divIcon({ html: svg, className: 'ship-icon', iconSize: [size, size], iconAnchor: [half, half] });
}

function createHullIcon(heading, isSelected) {
  const size = isSelected ? 38 : 32;
  const half = size / 2;
  const fill = isSelected ? FILL_SEL : FILL;
  const stroke = isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.45)';
  const sw = isSelected ? 1.3 : 0.5;

  const rot = heading - 90;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${rot}, 18, 18)">
      <path d="M 4,14.5 L 28,14.5 Q 33,18 28,21.5 L 4,21.5 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    </g></svg>`;

  return L.divIcon({ html: svg, className: 'ship-icon', iconSize: [size, size], iconAnchor: [half, half] });
}

export default function ShipMarker({ ship, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const showTrack = isSelected || hovered;

  const headingRounded = Math.round(ship.heading);

  const icon = useMemo(
    () => ship.markerType === 'hull'
      ? createHullIcon(headingRounded, isSelected)
      : createTriangleIcon(headingRounded, isSelected),
    [headingRounded, ship.markerType, isSelected]
  );

  const remainingRoute = useMemo(() => {
    if (!ship.waypoints || ship.currentWaypointIndex == null) return [];
    return [ship.position, ...ship.waypoints.slice(ship.currentWaypointIndex)];
  }, [ship.position, ship.waypoints, ship.currentWaypointIndex]);

  const handleMouseOver = useCallback(() => setHovered(true), []);
  const handleMouseOut = useCallback(() => setHovered(false), []);

  return (
    <>
      {showTrack && remainingRoute.length > 1 && (
        <Polyline
          positions={remainingRoute}
          pathOptions={{
            color: ROUTE_COLOR,
            weight: 1.5,
            opacity: 0.45,
            dashArray: '4 6',
          }}
        />
      )}

      <Marker
        position={ship.position}
        icon={icon}
        eventHandlers={{
          click: () => onSelect(ship.id),
          mouseover: handleMouseOver,
          mouseout: handleMouseOut,
        }}
      >
        <Tooltip direction="right" offset={[10, 0]} permanent className="ship-name-tooltip">
          {ship.name}
        </Tooltip>
      </Marker>
    </>
  );
}
