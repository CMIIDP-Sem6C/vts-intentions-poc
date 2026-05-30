/** Duration (in simulation seconds) that an AlertIntentionChange stays visible. */
export const ALERT_INTENTION_CHANGE_DURATION_SEC = 8;

/**
 * Map an event's subject_id to a ship database id.
 * If the event's subjectType is "intention", resolves through the intention
 * to find the owning ship's id.
 *
 * @param {ScenarioEvent} event - The scenario event
 * @param {Ship[]} ships - Ships array (unused but kept for API compat)
 * @param {Intention[]} intentions - Intentions array for lookup
 * @returns {number|null} The ship's database id, or null
 */
export function resolveEventShipId(event, ships, intentions) {
  if (!event) return null;
  if (event.subjectType === "intention") {
    const intention = (intentions || []).find(
      (intention) => intention.id === event.subjectId,
    );
    if (intention) {
      return intention.dbShipId ?? intention.ship_id ?? null;
    }
  }
  return event.subjectId;
}

/**
 * Find a ship by its database id.
 * @param {Ship[]} ships - Ships array
 * @param {number|null} dbShipId - Database ship id to find
 * @returns {Ship|null} The matching ship, or null
 */
export function findShipByDbId(ships, dbShipId) {
  if (dbShipId == null || !ships?.length) return null;
  const id = Number(dbShipId);
  return ships.find((ship) => Number(ship.dbId ?? ship.id) === id) ?? null;
}

/**
 * Get a human-readable display name for a ship by its database id.
 * Falls back to "Ship {id}" if the ship is not found or has no name.
 *
 * @param {Ship[]} ships - Ships array
 * @param {number|null} dbShipId - Database ship id
 * @returns {string} Display name
 */
export function getShipDisplayName(ships, dbShipId) {
  const ship = findShipByDbId(ships, dbShipId);
  if (!ship) return `Ship ${dbShipId}`;
  const name = ship.name ?? ship.shortname;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : `Ship ${dbShipId}`;
}

/**
 * Get active AlertIntentionChange events for the current simulation time.
 *
 * @param {ScenarioEvent[]} events - All scenario events
 * @param {Ship[]} ships - Ships array
 * @param {Intention[]} intentions - Intentions array
 * @param {number} simTime - Current simulation time in seconds
 * @param {number} [durationSec=ALERT_INTENTION_CHANGE_DURATION_SEC] - How long an alert stays visible
 * @returns {IntentionChangeAlert[]} Active alerts
 */
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
