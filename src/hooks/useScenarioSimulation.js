import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "../utils/navigation";

const TICK_MS = 150;
const TIME_SCALE = 4;
const AVOID_OFFSET_NM = 0.04;
const AVOID_RAMP_PER_TICK = 0.0014;
const AVOID_RETURN_EPSILON = 0.001;

function initShip(ship) {
  const waypoints = Array.isArray(ship.waypoints) ? ship.waypoints : [];
  const first = waypoints[0];
  const second = waypoints[1];
  const initialHeading = first && second ? calculateHeading(first, second) : 0;
  const initialPos = first ? [...first] : [0, 0];
  console.log(ship);
  return {
    ...ship,
    position: initialPos,
    currentWaypointIndex: waypoints.length > 1 ? 1 : 0,
    baseSpeed: ship.speed || 5,
    arrived: false,
    heading: initialHeading,
    baseHeading: initialHeading,
    avoidTarget: 0,
    avoidCurrent: 0,
    displayPosition: initialPos,
    prevDisplayPosition: initialPos,
    intentionsPosition: ship.intentions ? [...ship.intentions[0]] : null,
    currentIntentionsIndex: 1,
    dynamicIntentionsPath: [],
  };
}

function applyMovement(ship) {
  if (ship.arrived) {
    return computeDisplay(ship);
  }
  const target = ship.waypoints[ship.currentWaypointIndex];
  if (!target) return { ...ship, arrived: true };

  const distToTarget = calculateDistance(ship.position, target);
  const headingToTarget = calculateHeading(ship.position, target);

  const hoursPerTick = (TICK_MS / 1000) * (TIME_SCALE / 3600);
  const moveDistNm = ship.baseSpeed * hoursPerTick;

  let nextShip;
  if (moveDistNm >= distToTarget) {
    const nextIndex = ship.currentWaypointIndex + 1;
    if (nextIndex >= ship.waypoints.length) {
      nextShip = {
        ...ship,
        position: [...target],
        arrived: true,
        baseHeading: ship.baseHeading,
      };
    } else {
      const nextTarget = ship.waypoints[nextIndex];
      const nextBaseHeading = calculateHeading(target, nextTarget);
      nextShip = {
        ...ship,
        position: [...target],
        currentWaypointIndex: nextIndex,
        baseHeading: nextBaseHeading,
      };
    }
  } else {
    const newPosition = moveAlongBearing(
      ship.position,
      headingToTarget,
      moveDistNm,
    );
    nextShip = { ...ship, position: newPosition, baseHeading: headingToTarget };
  }

  return computeDisplay(nextShip);
}

function computeDisplay(ship) {
  const target = ship.avoidTarget || 0;
  const current = ship.avoidCurrent || 0;
  let nextOffset = current;
  // if (target > current)
  //   nextOffset = Math.min(target, current + AVOID_RAMP_PER_TICK);
  // else if (target < current)
  //   nextOffset = Math.max(target, current - AVOID_RAMP_PER_TICK);

  const perpHeading = (ship.baseHeading - 90 + 360) % 360;
  const displayPosition =
    nextOffset === 0
      ? [...ship.position]
      : moveAlongBearing(ship.position, perpHeading, nextOffset);

  const prev = ship.displayPosition || displayPosition;
  const movedNm = calculateDistance(prev, displayPosition);
  const visualHeading =
    movedNm > 0.0001
      ? calculateHeading(prev, displayPosition)
      : (ship.heading ?? ship.baseHeading);

  return {
    ...ship,
    avoidCurrent: nextOffset,
    displayPosition,
    prevDisplayPosition: prev,
    heading: visualHeading,
  };
}

export default function useScenarioSimulation(scenarioData) {
  const ships = scenarioData?.ships || null;
  const events = scenarioData?.events || null;
  const intentions = scenarioData?.intentions || null;

  const [elapsed, setElapsed] = useState(0);
  const [activeShips, setActiveShips] = useState([]);
  const [visibleIntentionIds, setVisibleIntentionIds] = useState(
    () => new Set(),
  );
  const [pendingShowIntentionIds, setPendingShowIntentionIds] = useState(
    () => new Set(),
  );

  const processedEventIdsRef = useRef(new Set());
  const startTimestampRef = useRef(null);

  useEffect(() => {
    setElapsed(0);
    setActiveShips([]);
    setVisibleIntentionIds(new Set());
    setPendingShowIntentionIds(new Set());
    processedEventIdsRef.current = new Set();
    startTimestampRef.current = Date.now();
  }, [scenarioData]);

  const triggerEvent = useCallback(
    (event) => {
      if (!event) return;

      if (event.type === "SpawnShip") {
        const ship = (ships || []).find(
          (ship) => ship.dbId === event.subjectId,
        );
        if (!ship) return;
        setActiveShips((prev) => {
          if (prev.some((s) => s.id === ship.id)) return prev;
          return [...prev, initShip(ship)];
        });
        // const shipIntentionIds = intentionsForShip(ship.dbId).map((i) => i.id);
        // if (shipIntentionIds.length > 0) {
        //   setVisibleIntentionIds((prev) => {
        //     const next = new Set(prev);
        //     shipIntentionIds.forEach((id) => next.add(id));
        //     return next;
        //   });
        // }
      } else if (
        event.type === "ShowIntention" ||
        event.type === "HideIntention"
      ) {
        console.log(event);
        const intention = (intentions || []).find(
          (intention) => intention.id === event.subjectId,
        );
        const targets = intention
          ? [intention]
          : (intentions || []).filter(
              (intention) => intention.dbShipId === event.subjectId,
            );

        const targetIds = targets.map((target) => target.id);
        const affectedShipIds = [
          ...new Set(targets.map((target) => target.dbShipId)),
        ];

        if (event.type === "HideIntention") {
          setVisibleIntentionIds((prev) => {
            const next = new Set(prev);
            targetIds.forEach((id) => next.delete(id));
            return next;
          });
          setPendingShowIntentionIds((prev) => {
            const next = new Set(prev);
            targetIds.forEach((id) => next.delete(id));
            return next;
          });
        } else {
          setPendingShowIntentionIds((prev) => {
            const next = new Set(prev);
            targetIds.forEach((id) => next.add(id));
            return next;
          });
        }

        setActiveShips((prev) =>
          prev.map((ship) => {
            if (!affectedShipIds.includes(ship.dbId)) return ship;
            const avoidTarget =
              event.type === "HideIntention" ? AVOID_OFFSET_NM : 0;
            return { ...ship, avoidTarget };
          }),
        );
      }
    },
    [ships, intentions],
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

  useEffect(() => {
    if (pendingShowIntentionIds.size === 0) return;
    const toPromote = [];
    pendingShowIntentionIds.forEach((intentionId) => {
      const intention = (intentions || []).find(
        (intention) => intention.id === intentionId,
      );
      if (!intention) return;
      const ship = activeShips.find((ship) => ship.dbId === intention.dbShipId);
      if (!ship) {
        toPromote.push(intentionId);
        return;
      }
      if (Math.abs(ship.avoidCurrent || 0) < AVOID_RETURN_EPSILON) {
        toPromote.push(intentionId);
      }
    });

    if (toPromote.length === 0) return;
    setVisibleIntentionIds((prev) => {
      const next = new Set(prev);
      toPromote.forEach((id) => next.add(id));
      return next;
    });
    setPendingShowIntentionIds((prev) => {
      const next = new Set(prev);
      toPromote.forEach((id) => next.delete(id));
      return next;
    });
  }, [activeShips, pendingShowIntentionIds, intentions]);

  const visibleIntentions = useMemo(() => {
    if (!intentions) return [];
    return intentions.filter((intention) =>
      visibleIntentionIds.has(intention.id),
    );
  }, [intentions, visibleIntentionIds]);

  const renderedShips = useMemo(
    () =>
      activeShips.map((ship) => ({
        ...ship,
        position: ship.displayPosition || ship.position,
      })),
    [activeShips],
  );

  return {
    ships: renderedShips,
    visibleIntentions,
    elapsed,
    scenarioDuration: scenarioData?.scenario?.time ?? null,
  };
}
