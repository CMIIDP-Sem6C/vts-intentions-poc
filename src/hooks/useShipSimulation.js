import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

const TICK_MS = 150;
const TIME_SCALE = 4;

export default function useShipSimulation(initialShips) {
  const [ships, setShips] = useState(() =>
    initialShips.map((ship) => ({
      ...ship,
      position: [...ship.waypoints[0]],
      currentWaypointIndex: 1,
      baseSpeed: ship.speed,
      arrived: false,
      heading: calculateHeading(ship.waypoints[0], ship.waypoints[1]),
    }))
  );

  const shipsRef = useRef(ships);
  shipsRef.current = ships;

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
          const nextIndex = ship.currentWaypointIndex + 1;
          if (nextIndex >= ship.waypoints.length) {
            return {
              ...ship,
              position: [...target],
              arrived: true,
            };
          }
          const nextTarget = ship.waypoints[nextIndex];
          return {
            ...ship,
            position: [...target],
            currentWaypointIndex: nextIndex,
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
