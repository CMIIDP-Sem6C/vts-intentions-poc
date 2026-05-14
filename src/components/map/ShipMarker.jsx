import { useMemo, useState, useCallback, useRef } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { getCourseVectorEnd } from "../../utils/navigation";
import { STATUS_COLORS } from "../../utils/status";

const FILL = "#1B5E20";
const FILL_SEL = "#2E7D32";
const ROUTE_COLOR = "#E57373";
const INTENTIONS_COLOR = "#bb47ff";
const VECTOR_COLOR = "#D32F2F";
const VECTOR_NM_PER_KNOT = 0.05;
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

function createHullIcon(heading, isSelected) {
  const size = isSelected ? 38 : 32;
  const half = size / 2;
  const fill = isSelected ? FILL_SEL : FILL;
  const stroke = isSelected ? "#FFFFFF" : "rgba(0,0,0,0.45)";
  const sw = isSelected ? 1.3 : 0.5;

  const rot = heading - 90;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${rot}, 18, 18)">
      <path d="M 4,14.5 L 28,14.5 Q 33,18 28,21.5 L 4,21.5 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
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
        ? createHullIcon(headingRounded, isSelected)
        : createTriangleIcon(headingRounded, isSelected),
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

  // find remaining route by intention or waypoints
  const remainingRoute = useMemo(() => {
    if (hasIntentions && ship.currentIntentionsIndex != null) {
      return [
        ship.intentionsPosition,
        ...ship.intentions.slice(ship.currentIntentionsIndex),
      ];
    }
    if (
      !ship.intentions &&
      ship.waypoints != null &&
      ship.currentWaypointIndex != null
    ) {
      return [
        ship.position,
        ...ship.waypoints.slice(ship.currentWaypointIndex),
      ];
    } else return [];
  }, [ship.position, ship.waypoints, ship.currentWaypointIndex]);

  const vectorEnd = useMemo(
    () =>
      getCourseVectorEnd(
        ship.position,
        ship.heading,
        ship.speed * VECTOR_NM_PER_KNOT,
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
      {showOverlay && remainingRoute.length > 1 && (
        <Polyline
          positions={remainingRoute}
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
