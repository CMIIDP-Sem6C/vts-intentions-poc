import { useMemo } from "react";
import { Marker, Polyline } from "react-leaflet";
import {
  computeETAMarkers,
  computeHatchMark,
  createETAIcon,
} from "@utils/shipIcons";

const INTENTIONS_COLOR = "#BB47FF";
const INTENTIONS_COLOR_HOVER = "#04e2ff";
const ETA_INTERVAL_MINUTES = 5;

/**
 * Layer that renders a ship's intentions path, hatch marks, and ETA labels.
 *
 * @param {Object} props
 * @param {Ship} props.ship - Enriched ship object
 * @param {boolean} props.showOverlay - Whether to show the intentions overlay
 * @param {number} props.timeScale - Simulation time scale factor
 * @param {number} props.startTime - Real-world start time as epoch ms
 * @param {boolean} props.isSelected - Whether the ship is currently selected
 */
export default function IntentionsLayer({
  ship,
  showOverlay,
  timeScale,
  startTime,
  isSelected,
}) {
  /** @type {Coordinates[]} */
  const intentionsToDisplay = useMemo(() => {
    if (!ship.intentionsShowActive) return [];
    if (
      ship.intentionsShowActive &&
      ship.dynamicIntentionsPath &&
      ship.dynamicIntentionsPath.length > 1
    ) {
      return ship.dynamicIntentionsPath.map((waypoint) => waypoint.coords);
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

  /** @type {ETAMarker[]} */
  const etaMarkers = useMemo(() => {
    if (
      !ship.intentionsShowActive ||
      !ship.dynamicIntentionsPath ||
      ship.dynamicIntentionsPath.length < 2
    ) {
      return [];
    }
    return computeETAMarkers(
      ship.dynamicIntentionsPath,
      ETA_INTERVAL_MINUTES,
      timeScale,
      startTime,
    );
  }, [
    ship.dynamicIntentionsPath,
    ship.intentionsShowActive,
    timeScale,
    startTime,
  ]);

  const activeIntentionsColor = isSelected
    ? INTENTIONS_COLOR
    : INTENTIONS_COLOR_HOVER;

  if (!showOverlay || intentionsToDisplay.length <= 1) return null;

  return (
    <>
      {/* Intention line */}
      <Polyline
        positions={intentionsToDisplay}
        pathOptions={{
          color: activeIntentionsColor,
          weight: 1.5,
          opacity: 0.6,
        }}
      />

      {/* Hatch marks at ETA positions */}
      {etaMarkers.map((m, idx) => {
        const hatch = computeHatchMark(m.coords, intentionsToDisplay);
        if (!hatch) return null;
        return (
          <Polyline
            key={`hatch-${ship.id}-${idx}`}
            positions={hatch}
            pathOptions={{
              color: activeIntentionsColor,
              weight: 1.5,
              opacity: 0.8,
            }}
          />
        );
      })}

      {/* ETA labels along intention line */}
      {etaMarkers.map((m, idx) => (
        <Marker
          key={`eta-${ship.id}-${idx}`}
          position={m.coords}
          icon={createETAIcon(m.label, activeIntentionsColor)}
          interactive={false}
        />
      ))}
    </>
  );
}
