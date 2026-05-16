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

export function useDynamicIntentionsDisplay() {
  const updateDynamicIntentions = useCallback((ship) => {
    const {
      intentionsShareTime,
      intentionsShowActive,
      intentionsShowComplete,
    } = ship;

    if (intentionsShowActive) {
      return [];
    }

    const hasValidIntentions =
      ship.intentions &&
      Array.isArray(ship.intentions) &&
      ship.intentions.length > 1;

    const routeSource = hasValidIntentions ? ship.intentions : ship.waypoints;
    const currentWaypointIndex = hasValidIntentions
      ? ship.currentIntentionsIndex
      : ship.currentWaypointIndex;
    const currentPosition = hasValidIntentions
      ? ship.intentionsPosition
      : ship.position;

    if (
      !routeSource ||
      !Array.isArray(routeSource) ||
      routeSource.length <= 1 ||
      currentWaypointIndex >= routeSource.length ||
      ship.arrived
    ) {
      return [];
    }

    if (intentionsShowComplete) {
      return [currentPosition, ...routeSource.slice(currentWaypointIndex)];
    }

    const minutes = Number(intentionsShareTime);
    if (isNaN(minutes) || minutes <= 0) {
      return [];
    }

    const startPos = currentPosition;
    const path = [startPos];
    let remainingTime = minutes;
    let currentIndex = currentWaypointIndex;

    while (currentIndex < routeSource.length && remainingTime > 0) {
      const prevWaypoint =
        currentIndex === currentWaypointIndex
          ? startPos
          : routeSource[currentIndex - 1];
      const currentWaypoint = routeSource[currentIndex];
      const segmentDistance = calculateDistance(prevWaypoint, currentWaypoint);
      const segmentTimeHours = segmentDistance / ship.baseSpeed;
      const segmentTimeMinutes = segmentTimeHours * 60;

      if (segmentTimeMinutes <= remainingTime) {
        path.push(currentWaypoint);
        remainingTime -= segmentTimeMinutes;
      } else {
        const remainingDistance = (remainingTime / 60) * ship.baseSpeed;
        const bearing = calculateHeading(prevWaypoint, currentWaypoint);
        const partialPos = moveAlongBearing(
          prevWaypoint,
          bearing,
          remainingDistance,
        );
        path.push(partialPos);
        remainingTime = 0;
      }

      currentIndex++;
    }

    return path;
  }, []);

  return { updateDynamicIntentions };
}
