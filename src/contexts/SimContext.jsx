import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useScenario } from "./ScenarioContext";
import { calculateDistance } from "../utils/navigation";

const SimContext = createContext(null);

const TICK_MS = 100;

export function SimProvider({ children }) {
  const { ships, events, originalShips, originalEvents } = useScenario();

  const [timeScale, setTimeScale] = useState(4);

  const spawnTimes = useMemo(() => {
    const map = new Map();
    for (const event of events || []) {
      if (event.type === "SpawnShip") {
        const triggerTime = event.triggerTime ?? 0;
        const existing = map.get(event.subjectId);
        if (existing == null || t < existing)
          map.set(event.subjectId, triggerTime);
      }
    }
    return map;
  }, [events]);

  const duration = useMemo(() => {
    let max = 0;
    for (const event of events || []) {
      const triggerTime = event.triggerTime ?? 0;
      if (triggerTime > max) max = triggerTime;
    }
    for (const ship of ships || []) {
      const key = ship.id ?? ship.dbId;
      const spawn = spawnTimes.get(key) ?? 0;
      const totalNm = totalRouteDistanceNm(ship.waypoints);
      const speed = ship.speed || 5;
      const arrival =
        speed > 0 ? spawn + ((totalNm / speed) * 3600) / timeScale : spawn;
      if (arrival > max) max = arrival;
    }
    return Math.max(1, Math.ceil(max + 5));
  }, [ships, events, spawnTimes, timeScale]);

  const [simTime, setSimTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    setSimTime(0);
    setIsPlaying(true);
  }, [ships, events]); // reset when scenario data changes

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

  const seek = useCallback(
    (time) => setSimTime(Math.max(0, Math.min(duration, time))),
    [duration],
  );
  const play = useCallback(() => {
    setSimTime((prev) => (prev >= duration ? 0 : prev));
    setIsPlaying(true);
  }, [duration]);
  const pause = useCallback(() => setIsPlaying(false), []);
  const restart = useCallback(() => {
    setSimTime(0);
    setIsPlaying(true);
  }, []);

  const value = useMemo(
    () => ({
      simTime,
      duration,
      isPlaying,
      timeScale,
      startTime,
      currentTime: Date.now(),
      spawnTimes,
      play,
      pause,
      seek,
      restart,
      setTimeScale,
    }),
    [
      simTime,
      duration,
      isPlaying,
      timeScale,
      startTime,
      spawnTimes,
      play,
      pause,
      seek,
      restart,
    ],
  );

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used within SimProvider");
  return ctx;
}

function totalRouteDistanceNm(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}
