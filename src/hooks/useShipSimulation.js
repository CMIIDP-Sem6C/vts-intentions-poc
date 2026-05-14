import { useState, useEffect, useRef, useCallback } from "react";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "../utils/navigation";

const TICK_MS = 150;
const TIME_SCALE = 4;
const RESTART_DELAY_MS = 30000;

export default function useShipSimulation(initialShips, onShipRestart) {
  const [ships, setShips] = useState(() =>
    initialShips.map((ship) => ({
      ...ship,
      position: [...ship.waypoints[0]],
      currentWaypointIndex: 1,
      intentionsPosition:
        ship.intentions && ship.intentions != null
          ? [...ship.intentions[0]]
          : null,
      currentIntentionsIndex: 1,
      baseSpeed: ship.speed,
      arrived: false,
      heading: calculateHeading(ship.waypoints[0], ship.waypoints[1]),
      dynamicIntentionsPath: [],
    })),
  );

  const shipsRef = useRef(ships);
  shipsRef.current = ships;

  const restartTimersRef = useRef({});
  const onShipRestartRef = useRef(onShipRestart);
  useEffect(() => {
    onShipRestartRef.current = onShipRestart;
  }, [onShipRestart]);

  // Helper function to calculate position after sailing for minutes
  const calculateFuturePosition = useCallback(
    (startPos, speed, minutes, target) => {
      const hours = minutes / 60;
      const distanceNm = speed * hours;
      const distToTarget = calculateDistance(startPos, target);

      if (distanceNm >= distToTarget) {
        return [...target];
      }

      const bearing = calculateHeading(startPos, target);
      return moveAlongBearing(startPos, bearing, distanceNm);
    },
    [],
  );
  // Calculate progress along intentions based on waypoint distance traveled
  const calculateIntentionsProgress = useCallback(
    (ship, waypointDistanceTraveled) => {
      if (!ship.intentions || ship.intentions.length <= 1) return [];

      let accumulated = 0;
      const intentionsPath = [ship.intentions[0]];

      // Build partial intentions path up to the equivalent distance
      for (let i = 1; i < ship.intentions.length; i++) {
        const segmentDistance = calculateDistance(
          ship.intentions[i - 1],
          ship.intentions[i],
        );
        if (accumulated + segmentDistance <= waypointDistanceTraveled) {
          accumulated += segmentDistance;
          intentionsPath.push(ship.intentions[i]);
        } else {
          // Partial segment
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
    },
    [],
  );

  // Update dynamic intentions path based on intentionsShareTime
  const updateDynamicIntentions = useCallback(
    (ship) => {
      if (!ship.intentions || ship.intentions.length <= 1 || ship.arrived) {
        return [];
      }

      const { intentionsShareTime } = ship;

      // If intentionsShareTime is null, don't show any intentions line
      if (
        intentionsShareTime === null ||
        (!ship.intentions && (!ship.waypoints || ship.waypoints.length <= 1))
      ) {
        return [];
      }

      // Determine the route source (intentions if available and valid, otherwise waypoints)
      const hasValidIntentions = ship.intentions && ship.intentions.length > 1;
      const routeSource = hasValidIntentions ? ship.intentions : ship.waypoints;
      const currentWaypointIndex = hasValidIntentions
        ? ship.currentIntentionsIndex
        : ship.currentWaypointIndex;
      const currentPosition = hasValidIntentions
        ? ship.intentionsPosition
        : ship.position;

      // If no valid route source, return empty path
      if (
        !routeSource ||
        routeSource.length <= 1 ||
        currentWaypointIndex >= routeSource.length
      ) {
        return [];
      }

      // If intentionsShareTime is "complete", show the complete intentions route
      if (intentionsShareTime === "complete") {
        return [currentPosition, ...routeSource.slice(currentWaypointIndex)];
      }

      // Otherwise, intentionsShareTime is a number (minutes)
      // Show intentions line for the distance the ship will sail in the next <number> minutes
      const minutes = Number(intentionsShareTime);
      if (isNaN(minutes) || minutes <= 0) {
        return [];
      }

      // Start from current intentions position
      const startPos = currentPosition;
      const targetIndex = currentWaypointIndex;

      // If we have a valid target waypoint
      if (targetIndex < routeSource.length) {
        const target = routeSource[targetIndex];
        const futurePos = calculateFuturePosition(
          startPos,
          ship.baseSpeed,
          minutes,
          target,
        );

        // If the future position reaches the target, include the target and potentially more waypoints
        const distToTarget = calculateDistance(startPos, target);
        const distanceInMinutes = ship.baseSpeed * (minutes / 60);

        if (distanceInMinutes >= distToTarget) {
          // We can reach the target, so include it
          const path = [startPos, target];

          // Calculate remaining time after reaching this target
          const timeToTargetHours = distToTarget / ship.baseSpeed;
          const remainingMinutes = minutes - timeToTargetHours * 60;

          // If we have remaining time, add more waypoints
          if (remainingMinutes > 0) {
            let currentIndex = targetIndex + 1;
            let currentTime = remainingMinutes;

            while (currentIndex < routeSource.length && currentTime > 0) {
              const prevWaypoint = routeSource[currentIndex - 1];
              const currentWaypoint = routeSource[currentIndex];
              const segmentDistance = calculateDistance(
                prevWaypoint,
                currentWaypoint,
              );
              const segmentTimeMinutes =
                (segmentDistance / ship.baseSpeed) * 60;

              if (segmentTimeMinutes <= currentTime) {
                // We can complete this segment
                path.push(currentWaypoint);
                currentTime -= segmentTimeMinutes;
              } else {
                // We can only partially complete this segment
                const remainingDistance = (currentTime / 60) * ship.baseSpeed;
                const bearing = calculateHeading(prevWaypoint, currentWaypoint);
                const partialPos = moveAlongBearing(
                  prevWaypoint,
                  bearing,
                  remainingDistance,
                );
                path.push(partialPos);
                currentTime = 0;
              }

              currentIndex++;
            }
          }

          return path;
        } else {
          // We don't reach the target, so just show the future position
          return [startPos, futurePos];
        }
      }

      return [];
    },
    [calculateFuturePosition],
  );

  const tick = useCallback(() => {
    setShips((prev) =>
      prev.map((ship) => {
        if (ship.arrived) return ship;

        const target = ship.waypoints[ship.currentWaypointIndex];
        if (!target) {
          return { ...ship, arrived: true };
        }

        const distToTarget = calculateDistance(ship.position, target);
        const headingToTarget = calculateHeading(ship.position, target);

        const hoursPerTick = (TICK_MS / 1000) * (TIME_SCALE / 3600);
        const moveDistNm = ship.baseSpeed * hoursPerTick;

        if (moveDistNm >= distToTarget) {
          const nextWaypointsIndex = ship.currentWaypointIndex + 1;
          if (nextWaypointsIndex >= ship.waypoints.length) {
            return {
              ...ship,
              position: [...target],
              arrived: true,
            };
          }
          const nextTarget = ship.waypoints[nextWaypointsIndex];
          return {
            ...ship,
            position: [...target],
            currentWaypointIndex: nextWaypointsIndex,
            heading: calculateHeading(target, nextTarget),
          };
        }

        const newPosition = moveAlongBearing(
          ship.position,
          headingToTarget,
          moveDistNm,
        );

        return {
          ...ship,
          position: newPosition,
          heading: headingToTarget,
        };
      }),
    );
  }, []);

  // Update dynamic intentions paths on each tick
  useEffect(() => {
    setShips((prev) =>
      prev.map((ship) => {
        const dynamicIntentionsPath = updateDynamicIntentions(ship);
        return {
          ...ship,
          dynamicIntentionsPath,
        };
      }),
    );
  }, [updateDynamicIntentions]);

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    ships.forEach((ship) => {
      if (!ship.arrived) return;
      if (restartTimersRef.current[ship.id]) return;

      restartTimersRef.current[ship.id] = setTimeout(() => {
        delete restartTimersRef.current[ship.id];
        setShips((prev) =>
          prev.map((s) => {
            if (s.id !== ship.id) return s;
            return {
              ...s,
              position: [...s.waypoints[0]],
              currentWaypointIndex: 1,
              arrived: false,
              heading: calculateHeading(s.waypoints[0], s.waypoints[1]),
            };
          }),
        );
        if (onShipRestartRef.current) {
          onShipRestartRef.current(ship.id);
        }
      }, RESTART_DELAY_MS);
    });
  }, [ships]);

  useEffect(() => {
    return () => {
      Object.values(restartTimersRef.current).forEach((t) => clearTimeout(t));
      restartTimersRef.current = {};
    };
  }, []);

  return ships;
}
