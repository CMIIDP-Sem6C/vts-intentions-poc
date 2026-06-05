import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useScenario } from "@contexts/ScenarioContext";
import { useSim } from "@contexts/SimContext";
import useVerificationSync from "@hooks/useVerificationSync";
import { getStatusLevel } from "@utils/status";
import {
  calculateDistance,
  calculateHeading,
  moveAlongBearing,
} from "@utils/navigation";
import { useDynamicIntentionsDisplay } from "@utils/dynamicIntentionsDisplay";

/** @type {React.Context<<ShipsContextValue|null>} */
const ShipsContext = createContext(null);

/**
 * Compute a ship's position along its waypoint route at a given simulation time.
 *
 * @param {NormalizedShip} ship - Ship with waypoints and speed
 * @param {number} spawnTime - Simulation time when the ship becomes visible
 * @param {number} departTime - Simulation time when the ship starts moving
 *   (>= spawnTime). Between spawn and depart the ship waits at its first
 *   waypoint, so it can be present on the map before it sets sail.
 * @param {number} time - Current simulation time in seconds
 * @param {number} timeScale - Simulation time scale factor
 * @returns {ShipMotion|null} Motion state, or null if ship hasn't spawned or has no route
 */
function computeShipPosition(ship, spawnTime, departTime, time, timeScale) {
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
  const travelSec = Math.max(0, time - departTime);
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

/**
 * Resolve an event's subject to a ship database id.
 * @param {ScenarioEvent} event
 * @param {NormalizedShip[]} ships
 * @param {Intention[]} intentions
 * @returns {number|null}
 */
function resolveEventShipId(event, ships, intentions) {
  if (!event) return null;
  if (event.subjectType === "intention") {
    const intention = (intentions || []).find((i) => i.id === event.subjectId);
    if (intention) return intention.dbShipId ?? intention.ship_id ?? null;
  }
  return event.subjectId;
}

/**
 * Compute which ships have their intentions currently visible,
 * based on initial state and ShowIntention/HideIntention events up to `time`.
 *
 * @param {ScenarioEvent[]} events - All scenario events
 * @param {NormalizedShip[]} ships - All ships
 * @param {Intention[]} intentions - All intentions
 * @param {number} time - Current simulation time
 * @returns {Map<number, boolean>} Map of ship id → intentions visible
 */
function computeIntentionVisibility(events, ships, intentions, time) {
  /** @type {Map<number, boolean>} */
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

/**
 * Provider that enriches scenario ships with motion, intentions, verification, and status.
 * @param {{ children: React.ReactNode }} props
 */

export function ShipsProvider({ children }) {
  const { ships: scenarioShips, intentions, events } = useScenario();
  const { simTime, timeScale, spawnTimes, departTimes } = useSim();
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

  /** @type {Ship[]} */
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
        const depart = departTimes.get(key) ?? spawn;
        const motion = computeShipPosition(
          ship,
          spawn,
          depart,
          simTime,
          timeScale,
        );
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
    departTimes,
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

  /** @type {ShipsContextValue} */
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

/**
 * Access the ships context.
 * @returns {ShipsContextValue}
 * @throws {Error} If used outside ShipsProvider
 */
export function useShips() {
  const ctx = useContext(ShipsContext);
  if (!ctx) throw new Error("useShips must be used within ShipsProvider");
  return ctx;
}
