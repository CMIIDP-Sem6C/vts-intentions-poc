import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from '../utils/navigation';

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

function computeIntentionVisibility(events, ships, intentions, t) {
  const visible = new Set();
  if (!events) return visible;

  const sorted = [...events].sort(
    (a, b) => (a.triggerTime ?? 0) - (b.triggerTime ?? 0)
  );

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

  const spawnTimes = useMemo(() => getSpawnTimes(events), [events]);

  const duration = useMemo(() => {
    let max = 0;
    for (const event of events || []) {
      const tt = event.triggerTime ?? 0;
      if (tt > max) max = tt;
    }
    for (const ship of ships || []) {
      const spawn = spawnTimes.get(ship.dbId) ?? 0;
      const arrival = spawn + shipTravelSeconds(ship);
      if (arrival > max) max = arrival;
    }
    return Math.max(1, Math.ceil(max + 5));
  }, [ships, events, spawnTimes]);

  const [simTime, setSimTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setSimTime(0);
    setIsPlaying(true);
  }, [scenarioData]);

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
  }, [isPlaying, duration]);

  const activeShips = useMemo(() => {
    if (!ships) return [];
    return ships
      .map((ship) => {
        const spawn = spawnTimes.get(ship.dbId);
        if (spawn == null) return null;
        const state = computeShipState(ship, spawn, simTime);
        if (!state) return null;
        return { ...ship, ...state };
      })
      .filter(Boolean);
  }, [ships, spawnTimes, simTime]);

  const visibleIntentions = useMemo(() => {
    const visibleIds = computeIntentionVisibility(events, ships, intentions, simTime);
    return (intentions || []).filter((i) => visibleIds.has(i.id));
  }, [events, ships, intentions, simTime]);

  const seek = useCallback(
    (t) => {
      const clamped = Math.max(0, Math.min(duration, t));
      setSimTime(clamped);
    },
    [duration]
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
