import { useMemo, useState, useCallback, useRef } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { getCourseVectorEnd } from "../../utils/navigation";
import { STATUS_COLORS, getStatusLevel } from "../../utils/status";

const FILL = "#1B5E20";
const FILL_SEL = "#2E7D32";
const ROUTE_COLOR = "#E57373";
const INTENTIONS_COLOR = "#bb47ff";
const VECTOR_COLOR = "#D32F2F";
const VECTOR_NM_PER_KNOT = 0.05;
const VECTOR_MAX_NM = 0.25;
const DEFAULT_LABEL_OFFSET_PX = [14, 0];

function createTriangleIcon(heading, isSelected) {
  const size = isSelected ? 20 : 16;
  const half = size / 2;
  const fill = isSelected ? FILL_SEL : FILL;
  const stroke = isSelected ? "#FFFFFF" : "rgba(0,0,0,0.5)";
  const sw = isSelected ? 1.5 : 0.6;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${heading}, 9, 9)">
      <path d="M 9,2 C 11.5,5 14,10 13.5,14 C 13,15.5 11,14.5 9,12.5
               C 7,14.5 5,15.5 4.5,14 C 4,10 6.5,5 9,2 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    </g></svg>`;

  return L.divIcon({
    html: svg,
    className: "ship-icon",
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function createHullIcon(heading, isSelected, ship) {
  const size = isSelected ? 38 : 32;
  const half = size / 2;
  const shipFill = isSelected ? FILL_SEL : FILL;
  const strokeColor = isSelected ? "#FFFFFF" : "rgba(0,0,0,0.45)";
  const strokeWidth = isSelected ? 1.3 : 0.5;
  const level = getStatusLevel(ship);
  const statusFill = STATUS_COLORS[level];

  const rot = heading - 90;
  const svg = `<svg  width="${size}" height="${size}" viewBox="0 0 34 12" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${rot}, 17, 6)">
    <path d="M24.1797 1L24.3477 1.0625H24.3486L24.3496 1.06348C24.3507 1.0639 24.3525 1.06468 24.3545 1.06543C24.3587 1.06699 24.3653 1.06838 24.373 1.07129C24.3885 1.07707 24.4107 1.08582 24.4395 1.09668C24.4975 1.11863 24.5821 1.15069 24.6875 1.19141C24.8983 1.27283 25.1953 1.38978 25.542 1.53125C26.2318 1.81271 27.1334 2.19853 27.9473 2.60547C28.3236 2.79366 28.7865 3.01009 29.2861 3.24414C29.7795 3.47527 30.3051 3.72187 30.7832 3.96094C31.2546 4.19666 31.7143 4.44142 32.0654 4.67188C32.2375 4.78482 32.4223 4.91968 32.5752 5.07129C32.652 5.14754 32.7451 5.25251 32.8242 5.38477C32.9012 5.51331 33 5.72614 33 6C33 6.37499 32.8083 6.63576 32.7373 6.72656C32.6427 6.84738 32.5347 6.94664 32.4473 7.01953C32.2683 7.16863 32.0436 7.31743 31.8184 7.45508C31.3596 7.73543 30.7667 8.04729 30.1973 8.33203C29.6227 8.61933 29.0502 8.88917 28.623 9.08691C28.4091 9.18596 28.2307 9.26755 28.1055 9.32422C28.0431 9.35241 27.9939 9.37444 27.96 9.38965C27.9433 9.39712 27.9299 9.40322 27.9209 9.40723C27.9164 9.40922 27.9125 9.41105 27.9102 9.41211C27.909 9.41264 27.9079 9.41279 27.9072 9.41309L27.9062 9.41406L27.8936 9.41895L24.3936 10.9189L24.2051 11H1V1H24.1797Z" fill="${shipFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
    <path d="M24 2C24 2 25.9379 2.71895 27.5 3.5C29.0621 4.28105 32 5.5 32 6C32 6.5 27.5 8.5 27.5 8.5L24 10H20V2H24Z" fill="${statusFill}"/>
  </g></svg>`;

  return L.divIcon({
    html: svg,
    className: "ship-icon",
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function createLabelIcon(name) {
  return L.divIcon({
    html: `<span class="ship-label-text">${name}</span>`,
    className: "ship-label-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 6],
  });
}

function pixelOffsetToLatLng(map, origin, pxOffset) {
  const originPx = map.latLngToContainerPoint(origin);
  const targetPx = L.point(originPx.x + pxOffset[0], originPx.y + pxOffset[1]);
  return map.containerPointToLatLng(targetPx);
}

/**
 *
 * @param {Ship} ship
 * @param {*} isSelected
 * @param {*} onSelect
 * @returns
 */
export default function ShipMarker({ ship, isSelected, onSelect }) {
  const map = useMap();
  const [hovered, setHovered] = useState(false);
  const [labelOffsetPx, setLabelOffsetPx] = useState(DEFAULT_LABEL_OFFSET_PX);
  const showOverlay = isSelected || hovered;
  const labelRef = useRef(null);

  const destKnown = ship.destination && ship.destination !== "Unknown";
  const hasIntentions = ship.intentions != null && ship.intentions.length > 1;

  const headingRounded = Math.round(ship.heading);

  const icon = useMemo(
    () =>
      ship.markerType === "hull"
        ? createHullIcon(headingRounded, isSelected, ship)
        : createTriangleIcon(headingRounded, isSelected, ship),
    [headingRounded, ship.markerType, isSelected],
  );

  const labelIcon = useMemo(() => createLabelIcon(ship.name), [ship.name]);

  const labelPos = useMemo(
    () => pixelOffsetToLatLng(map, ship.position, labelOffsetPx),
    [map, ship.position, labelOffsetPx],
  );

  const hasCustomOffset =
    labelOffsetPx[0] !== DEFAULT_LABEL_OFFSET_PX[0] ||
    labelOffsetPx[1] !== DEFAULT_LABEL_OFFSET_PX[1];

  const intentionsToDisplay = useMemo(() => {
    if (!ship.intentionsShowActive) return [];
    // Use dynamicIntentionsPath if it exists and has more than one point
    if (
      ship.intentionsShowActive &&
      ship.dynamicIntentionsPath &&
      ship.dynamicIntentionsPath.length > 1
    ) {
      return ship.dynamicIntentionsPath;
    }
    return [];
  }, [
    ship.position,
    ship.waypoints,
    ship.currentWaypointIndex,
    ship.dynamicIntentionsPath,
    ship.intentionsPosition,
    ship.intentions,
    ship.currentIntentionsIndex,
    ship.intentionsShowActive,
  ]);

  const vectorEnd = useMemo(
    () =>
      getCourseVectorEnd(
        ship.position,
        ship.heading,
        Math.min(ship.speed * VECTOR_NM_PER_KNOT, VECTOR_MAX_NM),
      ),
    [ship.position, ship.heading, ship.speed],
  );

  const handleMouseOver = useCallback(() => setHovered(true), []);
  const handleMouseOut = useCallback(() => setHovered(false), []);

  const handleLabelDragEnd = useCallback(
    (e) => {
      const newLatLng = e.target.getLatLng();
      const shipPx = map.latLngToContainerPoint(ship.position);
      const labelPx = map.latLngToContainerPoint(newLatLng);
      setLabelOffsetPx([labelPx.x - shipPx.x, labelPx.y - shipPx.y]);
    },
    [map, ship.position],
  );

  return (
    <>
      {/* Intention line */}
      {showOverlay && intentionsToDisplay.length > 1 && (
        <Polyline
          positions={intentionsToDisplay}
          pathOptions={{
            color: hasIntentions ? INTENTIONS_COLOR : VECTOR_COLOR,
            weight: 1.5,
            opacity: 0.6,
          }}
        />
      )}
      {/* Vector line */}
      {!showOverlay && destKnown && ship.aisActive && (
        <Polyline
          positions={[ship.position, vectorEnd]}
          pathOptions={{
            color: VECTOR_COLOR,
            weight: 1,
            opacity: 0.6,
          }}
        />
      )}

      {hasCustomOffset && (
        <Polyline
          positions={[ship.position, labelPos]}
          pathOptions={{ color: "#555", weight: 0.5, opacity: 0.5 }}
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
      />

      <Marker
        ref={labelRef}
        position={labelPos}
        icon={labelIcon}
        draggable
        eventHandlers={{
          dragend: handleLabelDragEnd,
          click: () => onSelect(ship.id),
          mouseover: handleMouseOver,
          mouseout: handleMouseOut,
        }}
      />
    </>
  );
}
