import { SECTORS } from "@data/sectors";

/**
 * Maps a DB sector_id to a SECTORS map key.
 * Unknown or null ids fall back to "waalhaven".
 *
 * @param {number|null} sectorId - Database sector_id value
 * @returns {string} The SECTORS map key (e.g. "waalhaven", "botlek")
 */
export function resolveSectorKeyFromDbId(sectorId) {
  if (sectorId == null) return "waalhaven";
  const hit = Object.entries(SECTORS).find(([, s]) => s.id === sectorId);
  if (hit) return hit[0];
  return "waalhaven";
}
