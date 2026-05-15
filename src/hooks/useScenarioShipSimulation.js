import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

const TICK_MS = 150;
const TIME_SCALE = 4;

function buildInitialShip(tmpl) {
  const wps = tmpl.waypoints || [];
  if (!wps.length) return null;
  if (wps.length < 2) {
    return {
      ...tmpl,
      position: [...wps[0]],
      currentWaypointIndex: 0,
      baseSpeed: tmpl.speed,
      arrived: false,
      heading: 0,
    };
  }
  return {
    ...tmpl,
    position: [...wps[0]],
    currentWaypointIndex: 1,
    baseSpeed: tmpl.speed,
    arrived: false,
    heading: calculateHeading(wps[0], wps[1]),
  };
}

/**
 * @param {Record<string, object>} shipTemplatesById — keys are string ship ids from API
 * @param {string[]} spawnedShipIds — list of ship ids that have SpawnShip fired
 */
export default function useScenarioShipSimulation(shipTemplatesById, spawnedShipIds) {
  const [ships, setShips] = useState([]);
  const templatesRef = useRef(shipTemplatesById);
  const spawnedRef = useRef(spawnedShipIds);

  useEffect(() => {
    templatesRef.current = shipTemplatesById;
  }, [shipTemplatesById]);

  useEffect(() => {
    spawnedRef.current = spawnedShipIds;
  }, [spawnedShipIds]);

  const spawnedKey = spawnedShipIds.join(',');

  useEffect(() => {
    setShips((prev) => {
      const templates = templatesRef.current;
      const prevById = Object.fromEntries(prev.map((s) => [String(s.id), s]));
      return spawnedShipIds.map((id) => {
        const sid = String(id);
        if (prevById[sid]) return prevById[sid];
        const tmpl = templates[sid];
        if (!templates[sid]) console.error("Template missing for ID:", sid, "Available:", Object.keys(templates));
        return buildInitialShip(tmpl);
      }).filter(Boolean);
    });
  }, [spawnedKey, shipTemplatesById, spawnedShipIds]);

  const tick = useCallback(() => {
    setShips((prev) => {
      const templates = templatesRef.current;
      const spawned = spawnedRef.current;
      const prevById = Object.fromEntries(prev.map((s) => [String(s.id), s]));

      return spawned.map((id) => {
        const sid = String(id);
        const tmpl = templates[sid];
        let ship = prevById[sid];
        if (!ship && tmpl) ship = buildInitialShip(tmpl);
        if (!ship) return null;

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

        const newPosition = moveAlongBearing(ship.position, headingToTarget, moveDistNm);
        return {
          ...ship,
          position: newPosition,
          heading: headingToTarget,
        };
      }).filter(Boolean);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);

  return ships;
}
