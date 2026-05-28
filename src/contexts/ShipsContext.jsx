import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useScenario } from "./ScenarioContext";
import { useSim } from "./SimContext";
import useVerificationSync from "../hooks/useVerificationSync";
import { getStatusLevel } from "../utils/status";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "../utils/navigation";
import { useDynamicIntentionsDisplay } from "../utils/dynamicIntentionsDisplay";

const ShipsContext = createContext(null);

function computeShipPosition(ship, spawnTime, time, timeScale) {
  const waypoints = ship.waypoints || [];
  if (waypoints.length === 0) return null;
  if (time < spawnTime) return null;
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
  const travelSec = time - spawnTime;
  let remaining = baseSpeed * ((travelSec * timeScale) / 3600);
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

function resolveEventShipId(event, ships, intentions) {
  if (!event) return null;
  if (event.subjectType === "intention") {
    const intention = (intentions || []).find((i) => i.id === event.subjectId);
    if (intention) return intention.dbShipId ?? intention.ship_id ?? null;
  }
  return event.subjectId;
}

function computeIntentionVisibility(events, ships, intentions, time) {
  const visible = new Map();
  for (const ship of ships || []) {
    const initial = ship.intentionsShowActive ?? false;
    const key = ship.id ?? ship.dbId;
    visible.set(key, Boolean(initial));
  }
  if (!events) return visible;
  const sorted = [...events].sort(
    (a, b) => (a.triggerTime ?? 0) - (b.triggerTime ?? 0),
  );
  for (const event of sorted) {
    if ((event.triggerTime ?? 0) > time) break;
    if (event.type !== "ShowIntention" && event.type !== "HideIntention")
      continue;
    const shipKey = resolveEventShipId(event, ships, intentions);
    if (shipKey == null) continue;
    visible.set(shipKey, event.type === "ShowIntention");
  }
  return visible;
}

export function ShipsProvider({ children }) {
  const { ships: scenarioShips, intentions, events } = useScenario();
  const { simTime, timeScale, spawnTimes } = useSim();
  const { verificationByShipId, updateVerification, verificationError } =
    useVerificationSync();
  const { updateDynamicIntentions } = useDynamicIntentionsDisplay();

  const [selectedShipId, setSelectedShipId] = useState(null);
  const [aisActiveMap, setAisActiveMap] = useState({});

  useEffect(() => {
    if (!scenarioShips) return;
    setAisActiveMap((prev) => {
      const next = { ...prev };
      scenarioShips.forEach((s) => {
        if (!(s.id in next)) next[s.id] = s.aisActive;
      });
      return next;
    });
  }, [scenarioShips]);

  const ships = useMemo(() => {
    if (!scenarioShips) return [];
    const visibility = computeIntentionVisibility(
      events,
      scenarioShips,
      intentions,
      simTime,
    );

    return scenarioShips
      .map((ship) => {
        const key = ship.id ?? ship.dbId;
        const spawn = spawnTimes.get(key);
        if (spawn == null) return null;
        const motion = computeShipPosition(ship, spawn, simTime, timeScale);
        if (!motion) return null;

        const intentionsShowActive = visibility.get(key) ?? false;
        const shipState = {
          ...ship,
          ...motion,
          intentionsShowActive,
          baseHeading: motion.heading,
        };
        const dyn = updateDynamicIntentions(shipState, simTime, timeScale);

        const merged = {
          ...shipState,
          dynamicIntentionsPath: dyn.displayPath,
          intentionsPosition: dyn.intentionsPosition,
          currentIntentionsIndex: dyn.currentIntentionsIndex,
          destination:
            verificationByShipId[ship.id]?.destination ?? ship.destination,
          verified: verificationByShipId[ship.id]?.verified ?? false,
          aisActive: aisActiveMap[ship.id] ?? ship.aisActive,
        };
        return { ...merged, status: getStatusLevel(merged) };
      })
      .filter(Boolean);
  }, [
    scenarioShips,
    events,
    intentions,
    simTime,
    spawnTimes,
    timeScale,
    updateDynamicIntentions,
    verificationByShipId,
    aisActiveMap,
  ]);

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId],
  );

  const selectShip = useCallback((id) => {
    setSelectedShipId((prev) => (prev === id ? null : id));
  }, []);

  const setDestination = useCallback(
    async (id, dest) => {
      try {
        await updateVerification(id, { destination: dest, verified: true });
      } catch (_) {}
    },
    [updateVerification],
  );

  const verifyShip = useCallback(
    async (id) => {
      try {
        await updateVerification(id, { verified: true });
      } catch (_) {}
    },
    [updateVerification],
  );

  const toggleShipVerification = useCallback(
    async (id, verified) => {
      try {
        await updateVerification(id, { verified });
      } catch (_) {}
    },
    [updateVerification],
  );

  const resetShip = useCallback(
    async (id) => {
      setAisActiveMap((prev) => ({ ...prev, [id]: false }));
      try {
        await updateVerification(id, {
          verified: false,
          destination: "Unknown",
        });
      } catch (_) {}
    },
    [updateVerification],
  );

  const value = useMemo(
    () => ({
      ships,
      selectedShipId,
      selectedShip,
      intentions,
      selectShip,
      setDestination,
      verifyShip,
      toggleShipVerification,
      resetShip,
      verificationError,
    }),
    [
      ships,
      selectedShipId,
      selectedShip,
      intentions,
      selectShip,
      setDestination,
      verifyShip,
      toggleShipVerification,
      resetShip,
      verificationError,
    ],
  );

  return (
    <ShipsContext.Provider value={value}>{children}</ShipsContext.Provider>
  );
}

export function useShips() {
  const ctx = useContext(ShipsContext);
  if (!ctx) throw new Error("useShips must be used within ShipsProvider");
  return ctx;
}
