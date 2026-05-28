import { useMemo, useState, useCallback, useRef } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { getCourseVectorEnd } from "@utils/navigation";
import { useSim } from "@contexts/SimContext";
import {
  createHullIcon,
  createTriangleIcon,
  createLabelIcon,
  pixelOffsetToLatLng,
} from "@utils/shipIcons";
import IntentionsLayer from "@components/map/IntentionsLayer";

const ROUTE_COLOR = "#E57373";
const VECTOR_COLOR = "#D32F2F";
const VECTOR_NM_PER_KNOT = 0.05;
const VECTOR_MAX_NM = 0.25;
const DEFAULT_LABEL_OFFSET_PX = [14, 0];

export default function ShipMarker({ ship, isSelected, onSelect }) {
  const map = useMap();
  const { simTime, timeScale, startTime } = useSim();
  const [hovered, setHovered] = useState(false);
  const [labelOffsetPx, setLabelOffsetPx] = useState(DEFAULT_LABEL_OFFSET_PX);
  const [expandLabel, setExpandLabel] = useState(false);
  const showOverlay = isSelected || hovered;
  const labelRef = useRef(null);

  const destKnown = ship.destination && ship.destination !== "Unknown";

  const headingRounded = Math.round(ship.heading);

  const icon = useMemo(
    () =>
      ship.markerType === "hull"
        ? createHullIcon(headingRounded, isSelected)
        : createTriangleIcon(headingRounded, isSelected),
    [headingRounded, ship.markerType, isSelected],
  );

  const labelIcon = useMemo(
    () => createLabelIcon(ship, expandLabel),
    [
      ship.name,
      ship.speed,
      ship.baseHeading,
      ship.destination,
      ship.intentionsShowActive,
      ship.operatorNotes,
      ship.verified,
      expandLabel,
    ],
  );

  const labelPos = useMemo(
    () => pixelOffsetToLatLng(map, ship.position, labelOffsetPx),
    [map, ship.position, labelOffsetPx],
  );

  const hasCustomOffset =
    labelOffsetPx[0] !== DEFAULT_LABEL_OFFSET_PX[0] ||
    labelOffsetPx[1] !== DEFAULT_LABEL_OFFSET_PX[1];

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
      <IntentionsLayer
        ship={ship}
        showOverlay={showOverlay}
        timeScale={timeScale}
        startTime={startTime}
        isSelected={isSelected}
      />

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
          click: () => {
            console.log(ship);
            onSelect(ship.id);
          },
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
          click: () => {
            setExpandLabel((currentExpandLabel) => !currentExpandLabel);
          },
          mouseover: handleMouseOver,
          mouseout: handleMouseOut,
        }}
      />
    </>
  );
}
