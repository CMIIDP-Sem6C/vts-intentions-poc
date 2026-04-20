import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

const TICK_MS = 150;
const TIME_SCALE = 15;

export default function useShipSimulation(initialShips) {
  const [ships, setShips] = useState(() =>
    initialShips.map((ship) => ({
      ...ship,
      position: [...ship.waypoints[0]],
      currentWaypointIndex: 1,
      direction: 1,
      baseSpeed: ship.speed,
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
          const newDir = ship.direction * -1;
          const newIdx = ship.currentWaypointIndex + newDir;
          const clamped = Math.max(0, Math.min(newIdx, ship.waypoints.length - 1));
          const nextWp = ship.waypoints[clamped];
          return {
            ...ship,
            direction: newDir,
            currentWaypointIndex: clamped,
            heading: nextWp ? calculateHeading(ship.position, nextWp) : ship.heading,
          };
        }

        const distToTarget = calculateDistance(ship.position, target);
        const headingToTarget = calculateHeading(ship.position, target);

        const hoursPerTick = (TICK_MS / 1000) * (TIME_SCALE / 3600);
        const moveDistNm = ship.baseSpeed * hoursPerTick;

        if (moveDistNm >= distToTarget) {
          const nextIndex = ship.currentWaypointIndex + ship.direction;
          if (nextIndex < 0 || nextIndex >= ship.waypoints.length) {
            const newDir = ship.direction * -1;
            const reverseIdx = ship.currentWaypointIndex + newDir;
            const clampedIdx = Math.max(0, Math.min(reverseIdx, ship.waypoints.length - 1));
            const nextWp = ship.waypoints[clampedIdx];
            return {
              ...ship,
              position: [...target],
              direction: newDir,
              currentWaypointIndex: clampedIdx,
              heading: nextWp ? calculateHeading(target, nextWp) : ship.heading,
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
