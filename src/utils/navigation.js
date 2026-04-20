const EARTH_RADIUS_NM = 3440.065;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Haversine distance between two [lat, lng] points in nautical miles.
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
 * Initial bearing (in degrees 0-360) from `from` to `to`.
 */
export function calculateHeading(from, to) {
  const lat1 = from[0] * DEG_TO_RAD;
  const lat2 = to[0] * DEG_TO_RAD;
  const dLng = (to[1] - from[1]) * DEG_TO_RAD;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

/**
 * Move a [lat, lng] position along a bearing by a given distance (nautical miles).
 * Returns a new [lat, lng].
 */
export function moveAlongBearing(position, bearingDeg, distanceNm) {
  const lat1 = position[0] * DEG_TO_RAD;
  const lng1 = position[1] * DEG_TO_RAD;
  const bearing = bearingDeg * DEG_TO_RAD;
  const angularDist = distanceNm / EARTH_RADIUS_NM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
    Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [lat2 * RAD_TO_DEG, lng2 * RAD_TO_DEG];
}

/**
 * Calculate ETA in seconds given distance in nautical miles and speed in knots.
 */
export function calculateETA(distanceNm, speedKnots) {
  if (speedKnots <= 0) return Infinity;
  return (distanceNm / speedKnots) * 3600;
}

/**
 * Format seconds into a human-readable "Xm Ys" or "Xh Ym" string.
 */
export function formatETA(seconds) {
  if (!isFinite(seconds)) return 'Unknown';
  if (seconds < 0) return 'Arrived';

  const totalMinutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }

  return `${String(totalMinutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Compute a point that lies `lengthNm` ahead of `position` along `headingDeg`.
 * Used to draw the course vector line on the map.
 */
export function getCourseVectorEnd(position, headingDeg, lengthNm) {
  return moveAlongBearing(position, headingDeg, lengthNm);
}

/**
 * Total remaining route distance from `currentIndex` through remaining waypoints.
 */
export function remainingRouteDistance(waypoints, currentIndex, currentPosition) {
  if (currentIndex >= waypoints.length) return 0;

  let total = calculateDistance(currentPosition, waypoints[currentIndex]);
  for (let i = currentIndex; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}
