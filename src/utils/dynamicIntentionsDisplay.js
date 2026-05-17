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

export function useDynamicIntentionsDisplay() {
  const updateDynamicIntentions = useCallback((ship) => {
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

    if (!intentionsShowActive) {
      // Still compute cursor so position stays in sync, but return empty path
      const hasValidIntentions =
        ship.intentions &&
        Array.isArray(ship.intentions) &&
        ship.intentions.length > 1;
      const routeSource = hasValidIntentions ? ship.intentions : ship.waypoints;
      const { cursorPos, cursorIndex } = getIntentionsCursor(ship, routeSource);
      return {
        path: [],
        intentionsPosition: cursorPos,
        currentIntentionsIndex: cursorIndex,
      };
    }

    if (
      !routeSource ||
      !Array.isArray(routeSource) ||
      routeSource.length <= 1 ||
      cursorIndex >= routeSource.length ||
      ship.arrived
    ) {
      return {
        path: [],
        intentionsPosition: cursorPos,
        currentIntentionsIndex: cursorIndex,
      };
    }

    if (intentionsShowComplete) {
      return {
        path: [cursorPos, ...routeSource.slice(cursorIndex)],
        intentionsPosition: cursorPos,
        currentIntentionsIndex: cursorIndex,
      };
    }

    const minutes = Number(intentionsShareTime);
    if (isNaN(minutes) || minutes <= 0) {
      return {
        path: [],
        intentionsPosition: cursorPos,
        currentIntentionsIndex: cursorIndex,
      };
    }

    const path = [cursorPos];
    let remainingTime = minutes;
    let currentIndex = cursorIndex;

    while (currentIndex < routeSource.length && remainingTime > 0) {
      const prevWaypoint =
        currentIndex === cursorIndex
          ? cursorPos
          : routeSource[currentIndex - 1];
      const currentWaypoint = routeSource[currentIndex];
      const segmentDistance = calculateDistance(prevWaypoint, currentWaypoint);
      const segmentTimeMinutes = (segmentDistance / ship.baseSpeed) * 60;

      if (segmentTimeMinutes <= remainingTime) {
        path.push(currentWaypoint);
        remainingTime -= segmentTimeMinutes;
      } else {
        const remainingDistance = (remainingTime / 60) * ship.baseSpeed;
        const bearing = calculateHeading(prevWaypoint, currentWaypoint);
        path.push(moveAlongBearing(prevWaypoint, bearing, remainingDistance));
        remainingTime = 0;
      }
      currentIndex++;
    }

    return {
      path,
      intentionsPosition: cursorPos,
      currentIntentionsIndex: cursorIndex,
    };
  }, []);

  return { updateDynamicIntentions };
}
