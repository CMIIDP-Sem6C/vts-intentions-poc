import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "../utils/navigation";
import { useDynamicIntentionsDisplay } from "../utils/dynamicIntentionsDisplay";

const TICK_MS = 100;
const TIME_SCALE = 4;

function totalRouteDistanceNm(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

function shipTravelSeconds(ship) {
  const totalNm = totalRouteDistanceNm(ship.waypoints);
  const speed = ship.speed || 5;
  if (speed <= 0) return 0;
  return (totalNm / speed) * 3600 / TIME_SCALE;
const AVOID_OFFSET_NM = 0.04;
const AVOID_RAMP_PER_TICK = 0.0014;
const AVOID_RETURN_EPSILON = 0.001;

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
    baseHeading: initialHeading,
    avoidTarget: 0,
    avoidCurrent: 0,
    displayPosition: initialPos,
    prevDisplayPosition: initialPos,
    intentionsPosition:
      ship.intentions && ship.intentions.length > 0
        ? [...ship.intentions[0]]
        : null,
    currentIntentionsIndex: 1,
    dynamicIntentionsPath: [],
  };
}

function getSpawnTimes(events) {
  const map = new Map();
  for (const event of events || []) {
    if (event.type === 'SpawnShip') {
      const t = event.triggerTime ?? 0;
      const existing = map.get(event.subjectId);
      if (existing == null || t < existing) map.set(event.subjectId, t);
    }
  }
  return map;
}

function computeShipState(ship, spawnTime, t) {
  const waypoints = ship.waypoints || [];
  if (waypoints.length === 0) return null;
  if (t < spawnTime) return null;

  const baseSpeed = ship.speed || 5;

  if (waypoints.length < 2) {
    return {
      position: [...waypoints[0]],
      heading: 0,
      currentWaypointIndex: 0,
      arrived: true,
      baseSpeed,
    };
  }

  const travelSec = t - spawnTime;
  let remaining = baseSpeed * (travelSec * TIME_SCALE / 3600);

  for (let i = 0; i < waypoints.length - 1; i++) {
    const segDist = calculateDistance(waypoints[i], waypoints[i + 1]);
    const heading = calculateHeading(waypoints[i], waypoints[i + 1]);
    if (remaining <= segDist) {
      const position =
        remaining <= 0
          ? [...waypoints[i]]
          : moveAlongBearing(waypoints[i], heading, remaining);
      return {
        position,
        heading,
        currentWaypointIndex: i + 1,
        arrived: false,
        baseSpeed,
      };
    }
    remaining -= segDist;
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

  const last = waypoints[waypoints.length - 1];
  const prev = waypoints[waypoints.length - 2];
  return {
    position: [...last],
    heading: calculateHeading(prev, last),
    currentWaypointIndex: waypoints.length - 1,
    arrived: true,
    baseSpeed,
  };
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

  for (const event of sorted) {
    if ((event.triggerTime ?? 0) > t) break;

    if (event.type === 'SpawnShip') {
      const ship = (ships || []).find((s) => s.dbId === event.subjectId);
      if (!ship) continue;
      (intentions || [])
        .filter((i) => i.dbShipId === ship.dbId)
        .forEach((i) => visible.add(i.id));
    } else if (event.type === 'ShowIntention' || event.type === 'HideIntention') {
      const intention = (intentions || []).find((i) => i.id === event.subjectId);
      const targets = intention
        ? [intention]
        : (intentions || []).filter((i) => i.dbShipId === event.subjectId);
      if (event.type === 'ShowIntention') {
        targets.forEach((it) => visible.add(it.id));
      } else {
        targets.forEach((it) => visible.delete(it.id));
      }
    }
  }
  return visible;
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
  const { updateDynamicIntentions } = useDynamicIntentionsDisplay();

  useEffect(() => {
    setSimTime(0);
    setIsPlaying(true);
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
        const isShow = event.type === "ShowIntention";
        setActiveShips((prev) => {
          const found = prev.find((ship) => ship.id === event.subjectId);
          if (!found) return prev; // ship not yet active, bail out
          return prev.map((ship) =>
            ship.id === event.subjectId
              ? { ...ship, intentionsShowActive: isShow } // don't mutate, spread
              : ship,
          );
        });
      }
    },
    [ships, intentions],
  );

  useEffect(() => {
    if (!isPlaying) return;
    let last = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      setSimTime((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [ships, events, triggerEvent]);

  // Update dynamic intentions paths for each ship
  useEffect(() => {
    setActiveShips((prev) => {
      const updatedShips = prev.map((ship) => {
        const result = updateDynamicIntentions(ship);
        return {
          ...ship,
          dynamicIntentionsPath: result.path,
          intentionsPosition: result.intentionsPosition,
          currentIntentionsIndex: result.currentIntentionsIndex,
        };
      });

      const hasChanges = updatedShips.some((updated, i) => {
        const prevPath = prev[i].dynamicIntentionsPath;
        const newPath = updated.dynamicIntentionsPath;
        if (prevPath.length !== newPath.length) return true;
        for (let j = 0; j < newPath.length; j++) {
          if (prevPath[j] !== newPath[j]) return true;
        }
        return false;
      });

      return hasChanges ? updatedShips : prev;
    });
  }, [updateDynamicIntentions, elapsed]);

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

  const play = useCallback(() => {
    setSimTime((prev) => (prev >= duration ? 0 : prev));
    setIsPlaying(true);
  }, [duration]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    setSimTime(0);
    setIsPlaying(true);
  }, []);

  return {
    ships: activeShips,
    visibleIntentions,
    simTime,
    duration,
    isPlaying,
    play,
    pause,
    seek,
    restart,
  };
}
