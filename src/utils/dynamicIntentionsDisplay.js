import { useCallback } from "react";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "@utils/navigation";

/**
 * Calculate a future position along a straight line toward a target.
 * @param {Coordinates} startPos - Starting [lat, lng]
 * @param {number} speed - Speed in knots
 * @param {number} minutes - Travel time in real-world minutes
 * @param {Coordinates} target - Target [lat, lng]
 * @returns {Coordinates} Future position
 */
export function calculateFuturePosition(startPos, speed, minutes, target) {
  const hours = minutes / 60;
  const distanceNm = speed * hours;
  const distToTarget = calculateDistance(startPos, target);

  if (distanceNm >= distToTarget) {
    return [...target];
  }

  const bearing = calculateHeading(startPos, target);
  return moveAlongBearing(startPos, bearing, distanceNm);
}

/**
 * Walk along the intentions route and return the path up to a given distance traveled.
 * @param {Ship} ship - Ship with `intentions` array
 * @param {number} waypointDistanceTraveled - Distance already traveled in nautical miles
 * @returns {Coordinates[]} The portion of the intention route covered
 */
export function calculateIntentionsProgress(ship, waypointDistanceTraveled) {
  if (!ship.intentions || ship.intentions.length <= 1) return [];

  let accumulated = 0;
  const intentionsPath = [ship.intentions[0]];

  for (let i = 1; i < ship.intentions.length; i++) {
    const segmentDistance = calculateDistance(
      ship.intentions[i - 1],
      ship.intentions[i],
    );
    if (accumulated + segmentDistance <= waypointDistanceTraveled) {
      accumulated += segmentDistance;
      intentionsPath.push(ship.intentions[i]);
    } else {
      const remaining = waypointDistanceTraveled - accumulated;
      const bearing = calculateHeading(
        ship.intentions[i - 1],
        ship.intentions[i],
      );
      const partialPos = moveAlongBearing(
        ship.intentions[i - 1],
        bearing,
        remaining,
      );
      intentionsPath.push(partialPos);
      break;
    }
  }

  return intentionsPath;
}

/**
 * Find the nearest point on the route path to the ship's actual position.
 * @param {Ship} ship - Ship with `position` and route data
 * @param {Coordinates[]} routeSource - The route to search (intentions or waypoints)
 * @returns {{ cursorPos: Coordinates, cursorIndex: number }}
 */
function getIntentionsCursor(ship, routeSource) {
  if (!routeSource || routeSource.length <= 1) {
    return { cursorPos: ship.position, cursorIndex: 0 };
  }

  let bestDist = Infinity;
  let bestPos = ship.position;
  let bestIndex = 1;

  for (let i = 1; i < routeSource.length; i++) {
    const { point, t } = nearestPointOnSegment(
      ship.position,
      routeSource[i - 1],
      routeSource[i],
    );
    const dist = calculateDistance(ship.position, point);
    if (dist < bestDist) {
      bestDist = dist;
      bestPos = point;
      // If t === 1 the ship is at the end of this segment, so the
      // "remaining" route starts at the *next* waypoint (i + 1).
      bestIndex = t >= 1 ? i + 1 : i;
    }
  }

  return { cursorPos: bestPos, cursorIndex: bestIndex };
}

/**
 * Project `pos` onto the segment [a, b] and return the clamped nearest point
 * plus the interpolation parameter t ∈ [0, 1].
 * @param {Coordinates} pos - Point to project
 * @param {Coordinates} a - Segment start
 * @param {Coordinates} b - Segment end
 * @returns {{ point: Coordinates, t: number }}
 */
function nearestPointOnSegment(pos, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { point: [...a], t: 0 };

  const t = Math.max(
    0,
    Math.min(1, ((pos[0] - a[0]) * dx + (pos[1] - a[1]) * dy) / lenSq),
  );

  return {
    point: [a[0] + t * dx, a[1] + t * dy],
    t,
  };
}

/**
 * Convert real-world travel minutes to simulation seconds.
 * @param {number} minutes - Real-world minutes
 * @param {number} timeScale - Simulation time scale factor
 * @returns {number} Simulation seconds
 */
function travelMinutesToSimSeconds(minutes, timeScale) {
  const realSeconds = minutes * 60;
  return realSeconds / timeScale;
}

/**
 * Hook that provides `updateDynamicIntentions` — a function that computes
 * the visible intentions path for a ship based on current sim state.
 *
 * @returns {{ updateDynamicIntentions: (ship: Ship, simTime: number, timeScale?: number) => DynamicIntentionsState }}
 */
export function useDynamicIntentionsDisplay() {
  /**
   * Compute the dynamic intentions display state for a single ship.
   * @param {Ship} ship - Enriched ship with motion + intention data
   * @param {number} simTime - Current simulation time in seconds
   * @param {number} [timeScale=1] - Simulation time scale factor
   * @returns {DynamicIntentionsState}
   */
  const updateDynamicIntentions = useCallback(
    (ship, simTime, timeScale = 1) => {
      const {
        intentionsShareTime,
        intentionsShowActive,
        intentionsShowComplete,
      } = ship;

      const hasValidIntentions =
        ship.intentions &&
        Array.isArray(ship.intentions) &&
        ship.intentions.length > 1;

      const routeSource = hasValidIntentions ? ship.intentions : ship.waypoints;

      const { cursorPos, cursorIndex } = getIntentionsCursor(ship, routeSource);

      if (
        !routeSource ||
        !Array.isArray(routeSource) ||
        routeSource.length <= 1 ||
        cursorIndex >= routeSource.length ||
        ship.arrived
      ) {
        return {
          path: [],
          displayPath: [],
          intentionsPosition: cursorPos,
          currentIntentionsIndex: cursorIndex,
        };
      }

      // Build full remaining route with ETAs from cursorPos onward
      /** @type {IntentionsPathPoint[]} */
      const path = [];
      let accSimSec = 0;
      path.push({ coords: [...cursorPos], eta: simTime });

      for (let i = cursorIndex; i < routeSource.length; i++) {
        const prev = i === cursorIndex ? cursorPos : routeSource[i - 1];
        const curr = routeSource[i];
        const segDist = calculateDistance(prev, curr);
        const segTimeMin = (segDist / ship.baseSpeed) * 60;
        accSimSec += travelMinutesToSimSeconds(segTimeMin, timeScale);
        path.push({ coords: [...curr], eta: simTime + accSimSec });
      }

      /** @type {IntentionsPathPoint[]} */
      let displayPath = [];

      if (!intentionsShowActive) {
        displayPath = [];
      } else if (intentionsShowComplete) {
        displayPath = path;
      } else {
        const minutes = Number(intentionsShareTime);
        if (isNaN(minutes) || minutes <= 0) {
          displayPath = [];
        } else {
          const maxSimSec = travelMinutesToSimSeconds(minutes, timeScale);
          displayPath = [path[0]];
          let remainingSimSec = maxSimSec;

          for (let i = 1; i < path.length; i++) {
            const etaDiff = path[i].eta - path[i - 1].eta;
            if (etaDiff <= remainingSimSec) {
              displayPath.push(path[i]);
              remainingSimSec -= etaDiff;
            } else {
              const fraction = remainingSimSec / etaDiff;
              const prevCoords = path[i - 1].coords;
              const currCoords = path[i].coords;
              const bearing = calculateHeading(prevCoords, currCoords);
              const segDist = calculateDistance(prevCoords, currCoords);
              const partialPos = moveAlongBearing(
                prevCoords,
                bearing,
                segDist * fraction,
              );
              displayPath.push({
                coords: partialPos,
                eta: path[i - 1].eta + remainingSimSec,
              });
              remainingSimSec = 0;
              break;
            }
          }
        }
      }

      return {
        path,
        displayPath,
        intentionsPosition: cursorPos,
        currentIntentionsIndex: cursorIndex,
      };
    },
    [],
  );

  return { updateDynamicIntentions };
}
