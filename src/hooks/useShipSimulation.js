import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

const TICK_MS = 150;
const TIME_SCALE = 4;
const RESTART_DELAY_MS = 30000;

export default function useShipSimulation(initialShips, onShipRestart) {
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

  const restartTimersRef = useRef({});
  const onShipRestartRef = useRef(onShipRestart);
  useEffect(() => {
    onShipRestartRef.current = onShipRestart;
  }, [onShipRestart]);

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
          })
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
