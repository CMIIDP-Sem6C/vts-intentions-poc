export const ALERT_INTENTION_CHANGE_DURATION_SEC = 8;

/** Map event subject_id to ship database id. */
export function resolveEventShipId(event, ships, intentions) {
  if (!event) return null;
  if (event.subjectType === "intention") {
    const intention = (intentions || []).find((i) => i.id === event.subjectId);
    if (intention) {
      return intention.dbShipId ?? intention.ship_id ?? null;
    }
  }
  return event.subjectId;
}

export function findShipByDbId(ships, dbShipId) {
  if (dbShipId == null || !ships?.length) return null;
  const id = Number(dbShipId);
  return (
    ships.find((s) => Number(s.dbId ?? s.id) === id) ??
    ships.find((s) => Number(s.id) === id) ??
    null
  );
}

export function getShipDisplayName(ships, dbShipId) {
  const ship = findShipByDbId(ships, dbShipId);
  if (!ship) return `Ship ${dbShipId}`;
  const name = ship.name ?? ship.shortname;
  return typeof name === "string" && name.trim() ? name.trim() : `Ship ${dbShipId}`;
}

/** Active AlertIntentionChange events for the current simulation time. */
export function getActiveIntentionChangeAlerts(
  events,
  ships,
  intentions,
  simTime,
  durationSec = ALERT_INTENTION_CHANGE_DURATION_SEC,
) {
  if (!events?.length) return [];

  return events
    .filter((e) => e.type === "AlertIntentionChange")
    .filter((e) => {
      const t = e.triggerTime ?? 0;
      return simTime >= t && simTime < t + durationSec;
    })
    .map((e) => {
      const shipDbId = resolveEventShipId(e, ships, intentions);
      return {
        key: e.id,
        shipName: getShipDisplayName(ships, shipDbId ?? e.subjectId),
      };
    });
}
