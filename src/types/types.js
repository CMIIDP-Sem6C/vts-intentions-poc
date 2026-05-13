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
 * @property {Coordinates[]} - Ship's route to sail
 * @property {OperatorNote[]} operatorNotes - Ship's messages and notes
 */
