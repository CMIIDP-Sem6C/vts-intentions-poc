import { useEffect, useState } from "react";

/**
 * Normalize a raw ship from the API by adding a guaranteed-numeric `dbId`.
 * @param {RawShip} rawShip - Ship object from the API
 * @returns {NormalizedShip|null} Normalized ship, or null if input is falsy
 */
function normalizeShip(rawShip) {
  if (!rawShip) return null;
  const dbId = typeof rawShip.id === "number" ? rawShip.id : Number(rawShip.id);
  return {
    ...rawShip,
    dbId,
  };
}

/**
 * Normalize a single intention entry from the grouped-by-ship format.
 * @param {Object} entry - Raw intention entry from the API
 * @param {number} dbShipId - Numeric ship ID this entry belongs to
 * @returns {Intention}
 */
function normalizeIntentionEntry(entry, dbShipId) {
  return {
    id: entry.id,
    dbShipId,
    name: typeof entry.name === "string" ? entry.name.trim() : entry.name,
    description: entry.description,
    route: Array.isArray(entry.route) ? entry.route : [],
  };
}

/**
 * Normalize intentions from either array or object-by-ship-id format.
 * @param {Intention[] | Object<string, Object[]> | null} rawIntentions
 * @returns {Intention[]}
 */
function normalizeIntentions(rawIntentions) {
  if (!rawIntentions) return [];
  if (Array.isArray(rawIntentions)) {
    return rawIntentions.map((i) => ({
      ...i,
      dbShipId: i.dbShipId ?? Number(i.ship_id),
      route: Array.isArray(i.route) ? i.route : [],
    }));
  }
  const out = [];
  Object.entries(rawIntentions).forEach(([shipIdKey, entries]) => {
    const dbShipId = Number(shipIdKey);
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) =>
      out.push(normalizeIntentionEntry(entry, dbShipId)),
    );
  });
  return out;
}

/**
 * Normalize a raw scenario event from the API (camelCase + snake_case compat).
 * @param {Object} rawEvent - Raw event from the API
 * @returns {ScenarioEvent}
 */
function normalizeEvent(rawEvent) {
  return {
    id: rawEvent.id,
    scenarioId: rawEvent.scenarioId ?? rawEvent.scenario_id,
    type: rawEvent.type,
    subjectType: rawEvent.subjectType ?? rawEvent.subject_type,
    subjectId: rawEvent.subjectId ?? rawEvent.subject_id,
    triggerTime: rawEvent.triggerTime ?? rawEvent.trigger_time,
  };
}

/**
 * Normalize a raw scenario from the API.
 * @param {Object} rawScenario - Raw scenario from the API
 * @returns {Scenario|null}
 */
function normalizeScenario(rawScenario) {
  if (!rawScenario) return null;
  return {
    ...rawScenario,
    time: rawScenario.time ?? rawScenario.duration_seconds,
  };
}

/**
 * Normalize the full scenario bundle from the API response.
 * @param {ScenarioBundle} payload - Raw API response
 * @returns {NormalizedScenarioData|null}
 */
function normalizeBundle(payload) {
  if (!payload) return null;
  const ships = (payload.ships || []).map(normalizeShip).filter(Boolean);
  const intentions = normalizeIntentions(
    payload.intentions ?? payload.intentions_by_ship_id,
  );
  const events = (payload.events || []).map(normalizeEvent);
  return {
    scenario: normalizeScenario(payload.scenario),
    ships,
    intentions,
    events,
  };
}

/**
 * Hook to fetch and normalize scenario data for a given scenario ID.
 * @param {number|null} scenarioId - Scenario ID to load, or null to clear
 * @returns {{ data: NormalizedScenarioData|null, loading: boolean, error: string|null }}
 */
export default function useScenarioData(scenarioId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (scenarioId == null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/scenarios/${scenarioId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setData(normalizeBundle(payload));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  return { data, loading, error };
}
