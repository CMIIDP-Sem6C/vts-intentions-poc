/**
 * @typedef {number[]} Coordinates
 */

/**
 * @typedef {Object} OperatorNote
 * @property {string} channel - VHF Channel
 * @property {string} location - ship's location when message was sent
 * @property {string} time - message timestamp
 * @property {string} note - contents of message
 */

/**
 * @typedef {Object} Ship - Object type for a Ship
 * @property {number | string} id - Ship's id
 * @property {string} name - Ship's name
 * @property {string} nationality - Ship's nationality
 * @property {"hull" | "triangle"} markerType - Marker to display for ship on radar/map
 * @property {"Binnenvaart" | "Zeevaart" | "Pleziervaart"} shipType - Type for ship: Binnenvaart, Zeevaart, Pleziervaart
 * @property {string} destination - Ship's given destination
 * @property {string} cargo - Shiper's cargo
 * @property {boolean} aisActive - Ship's AIS turned on/off
 * @property {"Geen signaal" | "Actief"} aisStatus - AIS status //This mirrors aisActive doesnt it??
 * @property {number} speed - Ship's speed
 * @property {Coordinates[]} waypoints - Ship's route to sail
 * @property {Coordinates[]} [intentions] - Ship's intentions to show: OPTIONAL. If not intentions given, simulation assumes intentions to be equal to waypoints with no deviations
 * @property {number | "unlimited" | null } intentionsShareTime- Time in minutes for which intentions to show. i.e 10 => Show the intentions from current location to 10 minutes into the future where ship will be
 * @property {OperatorNote[]} operatorNotes - Ship's messages and notes
 */
