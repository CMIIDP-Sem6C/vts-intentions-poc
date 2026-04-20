import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

const TICK_MS = 150;
const TIME_SCALE = 120; // 1 real second = 2 minutes of simulation time

/**
 * Simulates ship movement along their waypoints.
 * Each tick, every ship advances toward its next waypoint based on its speed.
 * When it reaches a waypoint, it moves to the next one.
 * When the route is complete, it loops back to the start.
 */
export default function useShipSimulation(initialShips) {
  const [ships, setShips] = useState(() =>
    initialShips.map((ship) => ({
      ...ship,
      position: [...ship.waypoints[0]],
      currentWaypointIndex: 1,
      heading: calculateHeading(ship.waypoints[0], ship.waypoints[1]),
    }))
  );

  const shipsRef = useRef(ships);
  shipsRef.current = ships;

  const tick = useCallback(() => {
    setShips((prev) =>
      prev.map((ship) => {
        const target = ship.waypoints[ship.currentWaypointIndex];
        if (!target) {
          return {
            ...ship,
            position: [...ship.waypoints[0]],
            currentWaypointIndex: 1,
            heading: calculateHeading(ship.waypoints[0], ship.waypoints[1]),
          };
        }

        const distToTarget = calculateDistance(ship.position, target);
        const headingToTarget = calculateHeading(ship.position, target);

        const hoursPerTick = (TICK_MS / 1000) * (TIME_SCALE / 3600);
        const moveDistNm = ship.speed * hoursPerTick;

        if (moveDistNm >= distToTarget) {
          const nextIndex = ship.currentWaypointIndex + 1;
          const nextTarget = ship.waypoints[nextIndex] || ship.waypoints[0];
          return {
            ...ship,
            position: [...target],
            currentWaypointIndex:
              nextIndex < ship.waypoints.length ? nextIndex : 1,
            heading: calculateHeading(target, nextTarget),
          };
        }

        const newPosition = moveAlongBearing(
          ship.position,
          headingToTarget,
          moveDistNm
        );

        return {
          ...ship,
          position: newPosition,
          heading: headingToTarget,
        };
      })
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);

  return ships;
}
