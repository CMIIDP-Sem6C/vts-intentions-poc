/**
 * Nieuwe Maas VTS sector -- Rotterdam.
 *
 * ALL coordinates are derived from the official OSM waterway centreline
 * (way 41948489 + 1460533133, queried 2026-04-12).
 *
 * Key verified centreline points (west -> east):
 *
 *   lon      | lat           |  landmark
 *  ----------+---------------+-----------------------------------
 *   4.3346   | 51.89427      |  sector west
 *   4.3501   | 51.89759      |
 *   4.3646   | 51.89948      |  river bends south
 *   4.3841   | 51.89720      |  south-dip
 *   4.4028   | 51.89819      |  climbing again
 *   4.4158   | 51.90101      |
 *   4.4242   | 51.90221      |
 *   4.4352   | 51.90204      |
 *   4.4408   | 51.90140      |  river dips south again
 *   4.4482   | 51.90004      |
 *   4.4548   | 51.89948      |  lowest point
 *   4.4660   | 51.90006      |  starts climbing steeply
 *   4.4738   | 51.90204      |
 *   4.4786   | 51.90388      |
 *   4.4837   | 51.90775      |  steep NE toward Erasmusbrug
 *   4.4864   | 51.91049      |  Erasmusbrug
 *   4.4896   | 51.91343      |
 *   4.4930   | 51.91573      |  sector east
 *
 * Each active ship uses a subset of these points with a small lateral
 * offset (+north / -south) so every route is unique and stays on water.
 */

export const MOCK_SHIPS = [
  /* ================================================================
     MICHIGAN  --  eastbound, triangle, offset +0.0004
     ================================================================ */
  {
    id: 'michigan',
    name: 'Michigan',
    markerType: 'triangle',
    shipType: 'Binnenvaart',
    destination: 'Wijnhaven',
    cargo: 'Steenkool',
    aisActive: false,
    aisStatus: 'Geen signaal',
    status: 'inbound',
    speed: 6.0,
    waypoints: [
      [51.8947, 4.3346],
      [51.8954, 4.3407],
      [51.8980, 4.3501],
      [51.8991, 4.3549],
      [51.8999, 4.3646],
      [51.8998, 4.3690],
      [51.8988, 4.3761],
      [51.8976, 4.3841],
      [51.8969, 4.3912],
      [51.8973, 4.3957],
      [51.8986, 4.4028],
      [51.9002, 4.4102],
      [51.9014, 4.4158],
      [51.9026, 4.4242],
      [51.9024, 4.4352],
    ],
    operatorNotes: [
      { channel: 'VHF60', location: 'Waalhaven', time: '10m 05s geleden', note: 'Niks speciaals bij de Michigan, geen bijzonderheden.' },
      { channel: 'VHF81', location: 'Pernis', time: '1h 11m geleden', note: 'Michigan passeert Pernis, geen bijzonderheden.' },
    ],
  },

  /* ================================================================
     ONUS  --  westbound, hull, offset -0.0004
     ================================================================ */
  {
    id: 'onus',
    name: 'Onus',
    markerType: 'hull',
    shipType: 'Binnenvaart',
    destination: 'Botlek',
    cargo: 'Containers',
    aisActive: true,
    aisStatus: 'Actief',
    status: 'inbound',
    speed: 7.0,
    waypoints: [
      [51.9153, 4.4930],
      [51.9130, 4.4896],
      [51.9101, 4.4864],
      [51.9074, 4.4837],
      [51.9054, 4.4812],
      [51.9035, 4.4786],
      [51.9016, 4.4738],
      [51.9008, 4.4708],
      [51.8997, 4.4660],
      [51.8990, 4.4612],
      [51.8991, 4.4548],
      [51.8996, 4.4482],
      [51.9010, 4.4408],
      [51.9016, 4.4352],
      [51.9018, 4.4242],
    ],
    operatorNotes: [
      { channel: 'VHF60', location: 'Erasmusbrug', time: '5m 30s geleden', note: 'Onus vaart in konvooi richting Botlek, normale doorvaart.' },
    ],
  },

  /* ================================================================
     EMMA  --  eastbound, triangle, offset +0.0002
     ================================================================ */
  {
    id: 'emma',
    name: 'Emma',
    markerType: 'triangle',
    shipType: 'Binnenvaart',
    destination: 'Unknown',
    cargo: 'Onbekend',
    aisActive: false,
    aisStatus: 'Geen signaal',
    status: 'inbound',
    speed: 5.0,
    waypoints: [
      [51.8944, 4.3197],
      [51.8945, 4.3346],
      [51.8952, 4.3407],
      [51.8978, 4.3501],
      [51.8989, 4.3549],
      [51.8997, 4.3646],
      [51.8996, 4.3690],
      [51.8986, 4.3761],
      [51.8974, 4.3841],
      [51.8967, 4.3912],
      [51.8971, 4.3957],
      [51.8984, 4.4028],
    ],
    operatorNotes: [],
  },

  /* ================================================================
     SCENIC AMBER  --  westbound, hull, in-sector, offset -0.0002
     ================================================================ */
  {
    id: 'scenic-amber',
    name: 'Scenic Amber',
    markerType: 'hull',
    shipType: 'Zeevaart',
    destination: 'Botlek',
    cargo: 'Passagiers',
    aisActive: true,
    aisStatus: 'Actief',
    status: 'in-sector',
    speed: 4.5,
    waypoints: [
      [51.9056, 4.4812],
      [51.9037, 4.4786],
      [51.9018, 4.4738],
      [51.9010, 4.4708],
      [51.8999, 4.4660],
      [51.8992, 4.4612],
      [51.8993, 4.4548],
      [51.8998, 4.4482],
      [51.9012, 4.4408],
      [51.9018, 4.4352],
      [51.9020, 4.4242],
      [51.9008, 4.4158],
    ],
    operatorNotes: [
      { channel: 'VHF60', location: 'Katendrecht', time: '22m geleden', note: 'Scenic Amber vaart richting Botlek, passagiers aan boord.' },
    ],
  },

  /* ================================================================
     PIETER BOELE  --  eastbound, hull, in-sector, offset +0.0005
     ================================================================ */
  {
    id: 'pieter-boele',
    name: 'Pieter Boele',
    markerType: 'hull',
    shipType: 'Binnenvaart',
    destination: 'Moerdijk',
    cargo: 'Zand',
    aisActive: true,
    aisStatus: 'Actief',
    status: 'in-sector',
    speed: 6.5,
    waypoints: [
      [51.9015, 4.4158],
      [51.9027, 4.4242],
      [51.9028, 4.4277],
      [51.9025, 4.4352],
      [51.9019, 4.4408],
      [51.9005, 4.4482],
      [51.9000, 4.4548],
      [51.8999, 4.4612],
      [51.9006, 4.4660],
      [51.9017, 4.4708],
      [51.9025, 4.4738],
      [51.9044, 4.4786],
    ],
    operatorNotes: [
      { channel: 'VHF81', location: 'Nieuwe Maas', time: '8m geleden', note: 'Pieter Boele op weg naar Moerdijk, geen bijzonderheden.' },
    ],
  },

  /* ================================================================
     NORDINA  --  westbound, triangle, in-sector, offset -0.0005
     ================================================================ */
  {
    id: 'nordina',
    name: 'Nordina',
    markerType: 'triangle',
    shipType: 'Binnenvaart',
    destination: 'Europoort',
    cargo: 'Chemicalien',
    aisActive: false,
    aisStatus: 'Geen signaal',
    status: 'in-sector',
    speed: 5.5,
    waypoints: [
      [51.8989, 4.4612],
      [51.8990, 4.4548],
      [51.8995, 4.4482],
      [51.9009, 4.4408],
      [51.9015, 4.4352],
      [51.9017, 4.4242],
      [51.9005, 4.4158],
      [51.8993, 4.4102],
      [51.8977, 4.4028],
      [51.8964, 4.3957],
      [51.8960, 4.3912],
    ],
    operatorNotes: [],
  },
];

/**
 * Moored vessels -- positioned inside real OSM harbor basins.
 * Center coordinates queried from Overpass API (2026-04-12).
 *
 * Harbors used:
 *   Heysehaven        51.8951, 4.4156
 *   1e Eemhaven       51.8902, 4.4119
 *   Eemhaven          51.8866, 4.4036
 *   Prins Johan Friso 51.8850, 4.4167
 *   Waalhaven         51.8895, 4.4417
 *   Kortenoordsehaven 51.8981, 4.4450
 *   Schiehaven        51.9025, 4.4540
 *   Merwehaven        51.9076, 4.4178
 *   Leuvehaven        51.9150, 4.4833
 */
export const MOORED_SHIPS = [
  // --- Heysehaven (N-S basin, ships face ~E/W) ---
  { id: 'mrd-1',  position: [51.8960, 4.4148], heading: 180, size: 'large'  },
  { id: 'mrd-2',  position: [51.8945, 4.4162], heading: 0,   size: 'medium' },

  // --- 1e Eemhaven (N-S basin) ---
  { id: 'mrd-3',  position: [51.8910, 4.4110], heading: 175, size: 'large'  },
  { id: 'mrd-4',  position: [51.8895, 4.4128], heading: 5,   size: 'medium' },

  // --- Eemhaven (large basin, extends south) ---
  { id: 'mrd-5',  position: [51.8875, 4.4030], heading: 170, size: 'large'  },
  { id: 'mrd-6',  position: [51.8860, 4.4045], heading: 350, size: 'large'  },
  { id: 'mrd-7',  position: [51.8850, 4.4025], heading: 175, size: 'medium' },

  // --- Prins Johan Frisohaven ---
  { id: 'mrd-8',  position: [51.8855, 4.4175], heading: 0,   size: 'large'  },
  { id: 'mrd-9',  position: [51.8842, 4.4160], heading: 180, size: 'medium' },

  // --- Waalhaven (very large basin) ---
  { id: 'mrd-10', position: [51.8905, 4.4400], heading: 90,  size: 'large'  },
  { id: 'mrd-11', position: [51.8888, 4.4430], heading: 270, size: 'large'  },
  { id: 'mrd-12', position: [51.8870, 4.4410], heading: 90,  size: 'medium' },
  { id: 'mrd-13', position: [51.8900, 4.4445], heading: 270, size: 'small'  },

  // --- Kortenoordsehaven ---
  { id: 'mrd-14', position: [51.8985, 4.4445], heading: 90,  size: 'medium' },
  { id: 'mrd-15', position: [51.8978, 4.4458], heading: 270, size: 'large'  },

  // --- Schiehaven ---
  { id: 'mrd-16', position: [51.9028, 4.4535], heading: 90,  size: 'medium' },
  { id: 'mrd-17', position: [51.9020, 4.4548], heading: 270, size: 'small'  },

  // --- Merwehaven (north of river) ---
  { id: 'mrd-18', position: [51.9082, 4.4170], heading: 180, size: 'large'  },
  { id: 'mrd-19', position: [51.9070, 4.4190], heading: 0,   size: 'medium' },

  // --- Leuvehaven ---
  { id: 'mrd-20', position: [51.9148, 4.4830], heading: 180, size: 'small'  },
];

/**
 * Radar contacts / small craft / buoys -- along the river banks.
 * Offset ~0.0015 lat from centreline (north or south bank).
 */
export const RADAR_CONTACTS = [
  { id: 'rc-1',  position: [51.8945, 4.3520] },
  { id: 'rc-2',  position: [51.9010, 4.3670] },
  { id: 'rc-3',  position: [51.8955, 4.3880] },
  { id: 'rc-4',  position: [51.9015, 4.4080] },
  { id: 'rc-5',  position: [51.9038, 4.4300] },
  { id: 'rc-6',  position: [51.8980, 4.4520] },
  { id: 'rc-7',  position: [51.9015, 4.4640] },
  { id: 'rc-8',  position: [51.9020, 4.4810] },
  { id: 'rc-9',  position: [51.9070, 4.4860] },
  { id: 'rc-10', position: [51.9175, 4.4940] },
];
