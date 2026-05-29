export const ALERT_INTENTION_CHANGE_DURATION_SEC = 8;

/** Map event subject_id to ship database id. */
export function resolveEventShipId(event, ships, intentions) {
  if (!event) return null;
  if (event.subjectType === "intention") {
    const intention = (intentions || []).find((intention) => intention.id === event.subjectId);
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
    ships.find((ship) => Number(ship.dbId ?? ship.id) === id) ??
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
    .filter((event) => event.type === "AlertIntentionChange")
    .filter((event) => {
      const triggerTime = event.triggerTime ?? 0;
      return simTime >= triggerTime && simTime < triggerTime + durationSec;
    })
    .map((event) => {
      const shipDbId = resolveEventShipId(event, ships, intentions);
      return {
        key: event.id,
        shipName: getShipDisplayName(ships, shipDbId ?? event.subjectId),
      };
    });
}
