import { useEffect, useMemo, useState } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { useScenario } from "@contexts/ScenarioContext";
import { useSim } from "@contexts/SimContext";
import { useShips } from "@contexts/ShipsContext";
import { calculateDistance } from "@utils/navigation";

/** @typedef {{ id: string, ship_ids: number[], position: [number, number], distance_m: number, trigger_time: number, active_from: number, active_until: number }} CrossingPrediction */

const CLEARANCE_NM = 200 / 1852;

/**
 * @param {import("../types").Coordinates} point
 * @param {import("../types").Coordinates} a
 * @param {import("../types").Coordinates} b
 * @returns {{ point: import("../types").Coordinates, t: number }}
 */
function nearestPointOnSegment(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { point: [...a], t: 0 };

  const t = Math.max(
    0,
    Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq),
  );

  return {
    point: [a[0] + t * dx, a[1] + t * dy],
    t,
  };
}

/**
 * Distance in nautical miles from the start of a route to the nearest point on it.
 * @param {import("../types").Coordinates[]} route
 * @param {import("../types").Coordinates} target
 * @returns {number|null}
 */
function distanceAlongRouteToPoint(route, target) {
  if (!Array.isArray(route) || route.length < 2) return null;

  let bestGeoDist = Infinity;
  let bestRouteDist = 0;
  let cumulative = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const segLen = calculateDistance(route[i], route[i + 1]);
    const { point, t } = nearestPointOnSegment(target, route[i], route[i + 1]);
    const geoDist = calculateDistance(target, point);
    const routeDist = cumulative + segLen * t;

    if (geoDist < bestGeoDist) {
      bestGeoDist = geoDist;
      bestRouteDist = routeDist;
    }

    cumulative += segLen;
  }

  return bestRouteDist;
}

/**
 * @param {import("../types").Ship} ship
 * @param {import("../types").Coordinates} crossingPosition
 * @param {import("../types").Coordinates[]} route
 * @returns {boolean}
 */
function hasShipPassedCrossing(ship, crossingPosition, route) {
  const crossingDist = distanceAlongRouteToPoint(route, crossingPosition);
  const shipDist = distanceAlongRouteToPoint(route, ship.position);
  if (crossingDist == null || shipDist == null) return false;
  return shipDist > crossingDist;
}

/**
 * @param {CrossingPrediction} prediction
 * @param {import("../types").Ship[]} ships
 * @returns {boolean}
 */
function bothShipsPassedCrossing(prediction, ships) {
  return prediction.ship_ids.every((id) => {
    const ship = ships.find((entry) => Number(entry.id) === Number(id));
    if (!ship) return false;

    const route = ship.intentions;
    if (!Array.isArray(route) || route.length < 2) return false;

    return hasShipPassedCrossing(ship, prediction.position, route);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {import("../types").NormalizedShip[]} scenarioShips
 * @param {number[]} shipIds
 * @returns {string}
 */
function formatCrossingLabel(scenarioShips, shipIds) {
  const names = shipIds.map((id) => {
    const ship = scenarioShips.find((entry) => Number(entry.id) === Number(id));
    const name = ship?.name ?? ship?.shortname;
    return typeof name === "string" && name.trim() ? name.trim() : `Ship ${id}`;
  });
  return `${names[0]} <-> ${names[1]}`;
}

/**
 * @param {string} label
 * @returns {L.DivIcon}
 */
function createCrossingBubbleIcon(label) {
  return L.divIcon({
    html: `
      <div class="crossing-alert-marker">
        <div class="crossing-alert-bubble" aria-hidden="true">
          <svg width="50" height="50" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3L1.5 21h21L12 3z"
              fill="none"
              stroke="#f44336"
              stroke-width="2.2"
              stroke-linejoin="round"
            />
            <path
              d="M12 9v5"
              stroke="#f44336"
              stroke-width="2.2"
              stroke-linecap="round"
            />
            <circle cx="12" cy="17.5" r="1.2" fill="#f44336" />
          </svg>
        </div>
        <div class="crossing-alert-bubble-label">${escapeHtml(label)}</div>
      </div>
    `,
    className: "crossing-alert-bubble-icon",
    iconSize: [160, 72],
    iconAnchor: [80, 25],
  });
}

/**
 * @param {CrossingPrediction[]} predictions
 * @param {import("../types").Ship[]} ships
 * @returns {CrossingPrediction[]}
 */
function getVisibleCrossingPredictions(predictions, ships) {
  const sharedShipIds = new Set(
    ships
      .filter((ship) => ship.intentionsShowActive)
      .map((ship) => Number(ship.id)),
  );

  return predictions.filter((prediction) => {
    if (!prediction.ship_ids.every((id) => sharedShipIds.has(Number(id)))) {
      return false;
    }

    return !bothShipsPassedCrossing(prediction, ships);
  });
}

/**
 * Fetch crossing predictions from the API and render alert bubbles on the map.
 */
export default function CrossingPredictionLayer() {
  const { scenarioId, ships: scenarioShips } = useScenario();
  const { timeScale } = useSim();
  const { ships } = useShips();
  /** @type {[CrossingPrediction[], React.Dispatch<React.SetStateAction<CrossingPrediction[]>>]} */
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    if (scenarioId == null) {
      setPredictions([]);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      threshold_m: "200",
      time_scale: String(timeScale),
    });

    fetch(
      `/api/scenarios/${scenarioId}/intention-crossing-predictions?${params}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setPredictions(Array.isArray(payload.predictions) ? payload.predictions : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load crossing predictions:", err);
        setPredictions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioId, timeScale]);

  const visiblePredictions = useMemo(
    () => getVisibleCrossingPredictions(predictions, ships),
    [predictions, ships],
  );

  const predictionIcons = useMemo(
    () =>
      new Map(
        visiblePredictions.map((prediction) => [
          prediction.id,
          createCrossingBubbleIcon(
            formatCrossingLabel(scenarioShips, prediction.ship_ids),
          ),
        ]),
      ),
    [visiblePredictions, scenarioShips],
  );

  return (
    <>
      {visiblePredictions.map((prediction) => (
        <Marker
          key={prediction.id}
          position={prediction.position}
          icon={predictionIcons.get(prediction.id)}
          interactive={false}
        />
      ))}
    </>
  );
}
