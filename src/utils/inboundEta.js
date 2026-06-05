import {
  calculateDistance,
  calculateETA,
  formatETA,
  pointInPolygon,
} from "@utils/navigation";

/**
 * Distance from a ship's current position to the sector boundary along its
 * remaining route.
 *
 * @param {Ship} ship - Enriched ship with position and waypoints
 * @param {Coordinates[]} sectorBoundary - Sector polygon boundary
 * @returns {number|null} Distance in nautical miles, or null if route doesn't enter the sector
 */
export function computeDistanceToSector(ship, sectorBoundary) {
  if (!ship.waypoints || ship.currentWaypointIndex == null) return null;

  let dist = calculateDistance(
    ship.position,
    ship.waypoints[ship.currentWaypointIndex],
  );
  for (let i = ship.currentWaypointIndex; i < ship.waypoints.length; i++) {
    if (pointInPolygon(ship.waypoints[i], sectorBoundary)) {
      return dist;
    }
    if (i < ship.waypoints.length - 1) {
      dist += calculateDistance(ship.waypoints[i], ship.waypoints[i + 1]);
    }
  }
  return null;
}

/**
 * ETA-in-sector label for a ship: "In sector" when already inside, otherwise
 * the formatted ETA along its remaining route, or a fallback when the route
 * does not enter the sector.
 *
 * @param {Ship} ship - Enriched ship with position, waypoints and speed
 * @param {Coordinates[]|null|undefined} sectorBoundary - Sector polygon boundary
 * @param {string|null} [fallback=null] - Returned when no ETA can be determined
 * @returns {string|null}
 */
export function getSectorEtaLabel(ship, sectorBoundary, fallback = null) {
  if (!sectorBoundary) return fallback;
  if (pointInPolygon(ship.position, sectorBoundary)) return "In sector";
  const dist = computeDistanceToSector(ship, sectorBoundary);
  if (dist == null) return fallback;
  return formatETA(calculateETA(dist, ship.speed));
}
