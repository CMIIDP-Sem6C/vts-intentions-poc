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
 * Traffic separation (keep starboard / rechts houden):
 *   - Eastbound ships offset SOUTH (-lat) from centreline
 *   - Westbound ships offset NORTH (+lat) from centreline
 * Each ship uses a unique offset magnitude so routes don't overlap.
 */

/**
 * @returns {Ship[]}
 */
export const MOCK_SHIPS = [
  /* ================================================================
     MICHIGAN  --  eastbound, triangle, south side (-0.0006)
     ================================================================ */
  {
    id: "michigan",
    name: "Michigan",
    nationality: "DE",
    markerType: "hull",
    shipType: "Zeevaart",
    destination: "Wijnhaven",
    cargo: "Geen",
    aisActive: true,
    aisStatus: "Actief",
    speed: 4.5,
    waypoints: [
      [51.8937, 4.3346],
      [51.897, 4.3501],
      [51.8989, 4.3646],
      [51.8966, 4.3841],
      [51.8976, 4.4028],
      [51.9004, 4.4158],
      [51.9016, 4.4242],
      [51.9014, 4.4352],
    ],
    intentions: [
      [51.8936, 4.3346],
      [51.896, 4.3501],
      [51.8988, 4.3646],
      [51.8967, 4.3841],
      [51.8978, 4.4028],
      [51.9003, 4.4158],
      [51.9015, 4.4242],
      [51.9012, 4.4352],
    ],
    intentionsShareTime: 10,
    operatorNotes: [
      {
        channel: "VHF60",
        location: "Waalhaven",
        time: "10m 05s geleden",
        note: "Niks speciaals bij de Michigan, geen bijzonderheden.",
      },
      {
        channel: "VHF81",
        location: "Pernis",
        time: "1h 11m geleden",
        note: "Michigan passeert Pernis, geen bijzonderheden.",
      },
    ],
  },

  /* ================================================================
     ONUS  --  westbound, hull, north side (+0.0007)
     ================================================================ */
  {
    id: "onus",
    name: "Onus",
    nationality: "NL",
    markerType: "hull",
    shipType: "Binnenvaart",
    destination: "Botlek",
    cargo: "Containers",
    aisActive: true,
    aisStatus: "Actief",
    speed: 7.0,
    waypoints: [
      [51.9164, 4.493],
      [51.9141, 4.4896],
      [51.9112, 4.4864],
      [51.9085, 4.4837],
      [51.9046, 4.4786],
      [51.9027, 4.4738],
      [51.9008, 4.466],
      [51.9002, 4.4548],
      [51.9007, 4.4482],
      [51.9021, 4.4408],
      [51.9027, 4.4352],
      [51.9029, 4.4242],
      [51.9017, 4.4158],
      [51.8989, 4.4028],
      [51.8979, 4.3841],
      [51.9002, 4.3646],
      [51.8983, 4.3501],
      [51.895, 4.3346],
    ],
    intentionsShareTime: "complete",
    operatorNotes: [
      {
        channel: "VHF60",
        location: "Erasmusbrug",
        time: "5m 30s geleden",
        note: "Onus vaart in konvooi richting Botlek, normale doorvaart.",
      },
    ],
  },

  /* ================================================================
     EMMA  --  eastbound, triangle, south side (-0.0008)
     ================================================================ */
  // {
  //   id: "emma",
  //   name: "Emma",
  //   nationality: "BG",
  //   markerType: "triangle",
  //   shipType: "Pleziervaart",
  //   destination: "Unknown",
  //   cargo: "Onbekend",
  //   aisActive: false,
  //   aisStatus: "Geen signaal",
  //   speed: 4.0,
  //   waypoints: [
  //     [51.8935, 4.3197],
  //     [51.8935, 4.3346],
  //     [51.8968, 4.3501],
  //     [51.8987, 4.3646],
  //     [51.8964, 4.3841],
  //     [51.8974, 4.4028],
  //   ],
  //   operatorNotes: [],
  // },

  /* ================================================================
     SCENIC AMBER  --  westbound, hull, north side (+0.0009)
     ================================================================ */
  // {
  //   id: "scenic-amber",
  //   name: "Scenic Amber",
  //   nationality: "DE",
  //   markerType: "hull",
  //   shipType: "Zeevaart",
  //   destination: "Botlek",
  //   cargo: "Passagiers",
  //   aisActive: true,
  //   aisStatus: "Actief",
  //   speed: 8.0,
  //   waypoints: [
  //     [51.9068, 4.4812],
  //     [51.9048, 4.4786],
  //     [51.9029, 4.4738],
  //     [51.901, 4.466],
  //     [51.9004, 4.4548],
  //     [51.9009, 4.4482],
  //     [51.9023, 4.4408],
  //     [51.9029, 4.4352],
  //     [51.9031, 4.4242],
  //     [51.9019, 4.4158],
  //     [51.8991, 4.4028],
  //     [51.8981, 4.3841],
  //     [51.9004, 4.3646],
  //     [51.8985, 4.3501],
  //     [51.8952, 4.3346],
  //   ],
  //   operatorNotes: [
  //     {
  //       channel: "VHF60",
  //       location: "Katendrecht",
  //       time: "22m geleden",
  //       note: "Scenic Amber vaart richting Botlek, passagiers aan boord.",
  //     },
  //   ],
  // },

  /* ================================================================
     PIETER BOELE  --  eastbound, hull, south side (-0.0004)
     ================================================================ */
  // {
  //   id: "pieter-boele",
  //   name: "Pieter Boele",
  //   nationality: "NL",
  //   markerType: "hull",
  //   shipType: "Binnenvaart",
  //   destination: "Moerdijk",
  //   cargo: "Zand",
  //   aisActive: true,
  //   aisStatus: "Actief",
  //   speed: 7.5,
  //   waypoints: [
  //     [51.9006, 4.4158],
  //     [51.9018, 4.4242],
  //     [51.9016, 4.4352],
  //     [51.901, 4.4408],
  //     [51.8996, 4.4482],
  //     [51.8991, 4.4548],
  //     [51.8997, 4.466],
  //     [51.9016, 4.4738],
  //     [51.9035, 4.4786],
  //     [51.9074, 4.4837],
  //     [51.9101, 4.4864],
  //     [51.913, 4.4896],
  //     [51.9153, 4.493],
  //   ],
  //   operatorNotes: [
  //     {
  //       channel: "VHF81",
  //       location: "Nieuwe Maas",
  //       time: "8m geleden",
  //       note: "Pieter Boele op weg naar Moerdijk, geen bijzonderheden.",
  //     },
  //   ],
  // },

  /* ================================================================
     NORDINA  --  westbound, triangle, north side (+0.0005)
     ================================================================ */
  // {
  //   id: "nordina",
  //   name: "Nordina",
  //   nationality: "BG",
  //   markerType: "triangle",
  //   shipType: "Pleziervaart",
  //   destination: "Europoort",
  //   cargo: "Geen",
  //   aisActive: false,
  //   aisStatus: "Geen signaal",
  //   speed: 3.5,
  //   waypoints: [
  //     [51.9005, 4.4612],
  //     [51.9, 4.4548],
  //     [51.9005, 4.4482],
  //     [51.9019, 4.4408],
  //     [51.9025, 4.4352],
  //     [51.9027, 4.4242],
  //     [51.9015, 4.4158],
  //     [51.8987, 4.4028],
  //     [51.8977, 4.3841],
  //   ],
  //   operatorNotes: [],
  // },
];
