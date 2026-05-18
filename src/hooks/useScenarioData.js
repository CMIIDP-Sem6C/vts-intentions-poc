import { useEffect, useState } from "react";

function normalizeShip(rawShip) {
  if (!rawShip) return null;
  if (typeof rawShip.id === "string" && rawShip.id.startsWith(SHIP_ID_PREFIX)) {
    return {
      ...rawShip,
      dbId: rawShip.dbId ?? Number(rawShip.id.slice(SHIP_ID_PREFIX.length)),
    };
  }
  const dbId = typeof rawShip.id === "number" ? rawShip.id : Number(rawShip.id);
  return {
    ...rawShip,
    dbId,
  };
}

function normalizeIntentionEntry(entry, dbShipId) {
  return {
    id: entry.id,
    dbShipId,
    name: typeof entry.name === "string" ? entry.name.trim() : entry.name,
    description: entry.description,
    route: Array.isArray(entry.route) ? entry.route : [],
  };
}

function normalizeIntentions(rawIntentions) {
  if (!rawIntentions) return [];
  if (Array.isArray(rawIntentions)) {
    return rawIntentions.map((i) => ({
      ...i,
      shipId: i.shipId ?? toAppShipId(i.dbShipId ?? i.ship_id),
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

function normalizeScenario(rawScenario) {
  if (!rawScenario) return null;
  return {
    ...rawScenario,
    time: rawScenario.time ?? rawScenario.duration_seconds,
  };
}

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
