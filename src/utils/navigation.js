const EARTH_RADIUS_NM = 3440.065;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Haversine distance between two [lat, lng] points in nautical miles.
 * @param {Coordinates} from - Origin [lat, lng]
 * @param {Coordinates} to - Destination [lat, lng]
 * @returns {number} Distance in nautical miles
 */
export function calculateDistance(from, to) {
  const dLat = (to[0] - from[0]) * DEG_TO_RAD;
  const dLng = (to[1] - from[1]) * DEG_TO_RAD;
  const lat1 = from[0] * DEG_TO_RAD;
  const lat2 = to[0] * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

/**
 * Initial bearing (in degrees 0–360) from `from` to `to`.
 * @param {Coordinates} from - Origin [lat, lng]
 * @param {Coordinates} to - Destination [lat, lng]
 * @returns {number} Bearing in degrees (0–360)
 */
export function calculateHeading(from, to) {
  const lat1 = from[0] * DEG_TO_RAD;
  const lat2 = to[0] * DEG_TO_RAD;
  const dLng = (to[1] - from[1]) * DEG_TO_RAD;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

/**
 * Move a [lat, lng] position along a bearing by a given distance.
 * @param {Coordinates} position - Starting [lat, lng]
 * @param {number} bearingDeg - Bearing in degrees
 * @param {number} distanceNm - Distance in nautical miles
 * @returns {Coordinates} New [lat, lng] position
 */
export function moveAlongBearing(position, bearingDeg, distanceNm) {
  const lat1 = position[0] * DEG_TO_RAD;
  const lng1 = position[1] * DEG_TO_RAD;
  const bearing = bearingDeg * DEG_TO_RAD;
  const angularDist = distanceNm / EARTH_RADIUS_NM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
      Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [lat2 * RAD_TO_DEG, lng2 * RAD_TO_DEG];
}

/**
 * Calculate ETA in seconds given distance and speed.
 * @param {number} distanceNm - Distance in nautical miles
 * @param {number} speedKnots - Speed in knots
 * @returns {number} ETA in seconds (Infinity if speed ≤ 0)
 */
export function calculateETA(distanceNm, speedKnots) {
  if (speedKnots <= 0) return Infinity;
  return (distanceNm / speedKnots) * 3600;
}

/**
 * Format seconds into a human-readable string.
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted string like "05m 30s" or "1h 05m", or "Unknown"/"Arrived"
 */
export function formatETA(seconds) {
  if (!isFinite(seconds)) return "Unknown";
  if (seconds < 0) return "Arrived";

  const totalMinutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  }

  return `${String(totalMinutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

/**
 * Compute a point that lies `lengthNm` ahead of `position` along `headingDeg`.
 * Used to draw the course vector line on the map.
 * @param {Coordinates} position - Ship's current [lat, lng]
 * @param {number} headingDeg - Heading in degrees
 * @param {number} lengthNm - Vector length in nautical miles
 * @returns {Coordinates} End point of the course vector
 */
export function getCourseVectorEnd(position, headingDeg, lengthNm) {
  return moveAlongBearing(position, headingDeg, lengthNm);
}

/**
 * Total remaining route distance from `currentIndex` through remaining waypoints.
 * @param {Coordinates[]} waypoints - Full route waypoints
 * @param {number} currentIndex - Index of the next waypoint to reach
 * @param {Coordinates} currentPosition - Ship's current [lat, lng]
 * @returns {number} Remaining distance in nautical miles
 */
export function remainingRouteDistance(
  waypoints,
  currentIndex,
  currentPosition,
) {
  if (currentIndex >= waypoints.length) return 0;

  let total = calculateDistance(currentPosition, waypoints[currentIndex]);
  for (let i = currentIndex; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

/**
 * Ray-casting point-in-polygon test.
 * @param {Coordinates} point - [lat, lng] to test
 * @param {Coordinates[]} polygon - Polygon vertices as [lat, lng] pairs
 * @returns {boolean} True if point is inside polygon
 */
export function pointInPolygon(point, polygon) {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if any waypoint of a ship passes through a sector polygon.
 * @param {Coordinates[]} waypoints - Ship's route waypoints
 * @param {Coordinates[]} sectorBoundary - Sector polygon boundary
 * @returns {boolean} True if any waypoint is inside the sector
 */
export function routePassesThroughSector(waypoints, sectorBoundary) {
  return waypoints.some((wp) => pointInPolygon(wp, sectorBoundary));
}
