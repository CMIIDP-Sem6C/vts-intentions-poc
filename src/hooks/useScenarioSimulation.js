import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

const TICK_MS = 150;
const TIME_SCALE = 4;

function initShip(ship) {
  const waypoints = Array.isArray(ship.waypoints) ? ship.waypoints : [];
  const first = waypoints[0];
  const second = waypoints[1];
  const initialHeading = first && second ? calculateHeading(first, second) : 0;
  const initialPos = first ? [...first] : [0, 0];
  return {
    ...ship,
    position: initialPos,
    currentWaypointIndex: waypoints.length > 1 ? 1 : 0,
    baseSpeed: ship.speed || 5,
    arrived: false,
    heading: initialHeading,
  };
}

function applyMovement(ship) {
  if (ship.arrived) return ship;
  const target = ship.waypoints[ship.currentWaypointIndex];
  if (!target) return { ...ship, arrived: true };

  const distToTarget = calculateDistance(ship.position, target);
  const headingToTarget = calculateHeading(ship.position, target);

  const hoursPerTick = (TICK_MS / 1000) * (TIME_SCALE / 3600);
  const moveDistNm = ship.baseSpeed * hoursPerTick;

  if (moveDistNm >= distToTarget) {
    const nextIndex = ship.currentWaypointIndex + 1;
    if (nextIndex >= ship.waypoints.length) {
      return { ...ship, position: [...target], arrived: true };
    }
    const nextTarget = ship.waypoints[nextIndex];
    return {
      ...ship,
      position: [...target],
      currentWaypointIndex: nextIndex,
      heading: calculateHeading(target, nextTarget),
    };
  }

  return {
    ...ship,
    position: moveAlongBearing(ship.position, headingToTarget, moveDistNm),
    heading: headingToTarget,
  };
}

export default function useScenarioSimulation(scenarioData) {
  const ships = scenarioData?.ships || null;
  const events = scenarioData?.events || null;
  const intentions = scenarioData?.intentions || null;

  const [elapsed, setElapsed] = useState(0);
  const [activeShips, setActiveShips] = useState([]);
  const [visibleIntentionIds, setVisibleIntentionIds] = useState(() => new Set());

  const processedEventIdsRef = useRef(new Set());
  const startTimestampRef = useRef(null);

  useEffect(() => {
    setElapsed(0);
    setActiveShips([]);
    setVisibleIntentionIds(new Set());
    processedEventIdsRef.current = new Set();
    startTimestampRef.current = Date.now();
  }, [scenarioData]);

  const intentionsForShip = useCallback(
    (dbShipId) => (intentions || []).filter((i) => i.dbShipId === dbShipId),
    [intentions]
  );

  const triggerEvent = useCallback(
    (event) => {
      if (!event) return;

      if (event.type === 'SpawnShip') {
        const ship = (ships || []).find((s) => s.dbId === event.subjectId);
        if (!ship) return;
        setActiveShips((prev) => {
          if (prev.some((s) => s.id === ship.id)) return prev;
          return [...prev, initShip(ship)];
        });
        const shipIntentionIds = intentionsForShip(ship.dbId).map((i) => i.id);
        if (shipIntentionIds.length > 0) {
          setVisibleIntentionIds((prev) => {
            const next = new Set(prev);
            shipIntentionIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } else if (event.type === 'ShowIntention' || event.type === 'HideIntention') {
        const intention = (intentions || []).find((i) => i.id === event.subjectId);
        const targets = intention
          ? [intention]
          : (intentions || []).filter((i) => i.dbShipId === event.subjectId);

        const targetIds = targets.map((t) => t.id);

        setVisibleIntentionIds((prev) => {
          const next = new Set(prev);
          if (event.type === 'HideIntention') {
            targetIds.forEach((id) => next.delete(id));
          } else {
            targetIds.forEach((id) => next.add(id));
          }
          return next;
        });
      }
    },
    [ships, intentions, intentionsForShip]
  );

  useEffect(() => {
    if (!ships || !events) return;
    startTimestampRef.current = Date.now();
    const interval = setInterval(() => {
      const start = startTimestampRef.current || Date.now();
      const seconds = Math.floor((Date.now() - start) / 1000);
      setElapsed(seconds);

      events.forEach((event) => {
        if (processedEventIdsRef.current.has(event.id)) return;
        if (event.triggerTime != null && event.triggerTime <= seconds) {
          processedEventIdsRef.current.add(event.id);
          triggerEvent(event);
        }
      });

      setActiveShips((prev) => prev.map(applyMovement));
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [ships, events, triggerEvent]);

  const visibleIntentions = useMemo(() => {
    if (!intentions) return [];
    return intentions.filter((i) => visibleIntentionIds.has(i.id));
  }, [intentions, visibleIntentionIds]);

  return {
    ships: activeShips,
    visibleIntentions,
    elapsed,
    scenarioDuration: scenarioData?.scenario?.time ?? null,
  };
}
