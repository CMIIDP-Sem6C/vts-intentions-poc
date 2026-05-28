import { useCallback } from "react";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "../utils/navigation";

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

// Finds the nearest point on the route path to the ship's actual position,
// rather than deriving position from distance-traveled on waypoints.
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

// Projects `pos` onto the segment [a, b] and returns the clamped
// nearest point plus the interpolation parameter t ∈ [0, 1].
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

function travelMinutesToSimSeconds(minutes, timeScale) {
  const realSeconds = minutes * 60;
  return realSeconds / timeScale;
}

export function useDynamicIntentionsDisplay() {
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
