/**
 * Sector boundary definition for the Oude Maas VTS sector.
 * Coordinates aligned with the actual Oude Maas waterway
 * (lat ~51.80-51.86, lon ~4.34-4.67).
 */
export const SECTOR_BOUNDARY = [
  [51.860, 4.340],
  [51.860, 4.670],
  [51.800, 4.670],
  [51.800, 4.340],
];

export const SECTOR_CENTER = [51.835, 4.490];
export const SECTOR_ZOOM = 13;

export const SECTOR_ENTRY_POINTS = {
  west: [51.855, 4.345],
  east: [51.807, 4.620],
  north: [51.860, 4.500],
  south: [51.800, 4.500],
};
