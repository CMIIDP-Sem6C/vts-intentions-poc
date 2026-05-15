import { SECTORS } from '../data/sectors';

/**
 * Maps DB sector_id to a SECTORS map key. Unknown ids fall back to waalhaven.
 */
export function resolveSectorKeyFromDbId(sectorId) {
  if (sectorId == null) return 'waalhaven';
  const hit = Object.entries(SECTORS).find(([, s]) => s.id === sectorId);
  if (hit) return hit[0];
  return 'waalhaven';
}
