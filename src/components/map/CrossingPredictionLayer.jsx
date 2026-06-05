import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { useScenario } from "@contexts/ScenarioContext";
import { useShips } from "@contexts/ShipsContext";
import { calculateDistance } from "@utils/navigation";
import { nearestPointOnSegment } from "@utils/dynamicIntentionsDisplay";

/**
 * Distance in nautical miles from the start of a route to the nearest point on it.
 * @param {Coordinates[]} route - Intention route polyline (`[lat, lng]` per point)
 * @param {Coordinates} target - Point to project onto the route
 * @returns {number|null} Distance along the route in NM, or `null` if the route is invalid
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
 * Whether a ship has sailed past a predicted crossing on its intention route.
 * @param {Ship} ship - Live ship with current `position` and `intentions` route
 * @param {Coordinates} crossingPosition - Predicted crossing `[lat, lng]`
 * @param {Coordinates[]} route - Intention route polyline for this ship
 * @returns {boolean} `true` when the ship's along-route distance exceeds the crossing point
 */
function hasShipPassedCrossing(ship, crossingPosition, route) {
  const crossingDist = distanceAlongRouteToPoint(route, crossingPosition);
  const shipDist = distanceAlongRouteToPoint(route, ship.position);
  if (crossingDist == null || shipDist == null) return false;
  return shipDist > crossingDist;
}

/**
 * Whether both ships in a prediction have passed the crossing point.
 * @param {CrossingPrediction} prediction - API crossing prediction
 * @param {Ship[]} ships - Live enriched ships from the simulation
 * @returns {boolean} `true` when every involved ship has passed the crossing
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

/**
 * Escape HTML special characters for safe insertion into marker markup.
 * @param {string|number} value - Raw label text
 * @returns {string} HTML-escaped string
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a short label for a crossing alert bubble (e.g. `"Ship A <-> Ship B"`).
 * @param {NormalizedShip[]} scenarioShips - Scenario ship records (for names)
 * @param {number[]} shipIds - IDs of the two ships in the prediction
 * @returns {string} Display label for the crossing marker
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
 * Leaflet div icon for a crossing warning bubble with ship names.
 * @param {string} label - HTML-safe ship-pair label (will be escaped again in markup)
 * @returns {L.DivIcon} Non-interactive warning marker icon
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
 * Filter crossing predictions to those that should be shown on the map.
 * A prediction is visible when both ships have shared intentions active and
 * at least one ship has not yet passed the crossing point.
 * @param {CrossingPrediction[]} predictions - Crossing predictions from the scenario bundle
 * @param {Ship[]} ships - Live enriched ships from the simulation
 * @returns {CrossingPrediction[]} Predictions that should render as map markers
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
 * Map layer that renders crossing-prediction warning bubbles for ship pairs
 * whose intention routes are predicted to pass within the API threshold.
 */
export default function CrossingPredictionLayer() {
  const { crossings, ships: scenarioShips } = useScenario();
  const { ships } = useShips();

  const visiblePredictions = useMemo(
    () => getVisibleCrossingPredictions(crossings || [], ships),
    [crossings, ships],
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
