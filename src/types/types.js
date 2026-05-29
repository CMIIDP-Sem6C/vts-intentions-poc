/**
 * A [latitude, longitude] pair in decimal degrees.
 * @typedef {number[]} Coordinates
 */

/**
 * A waypoint along an intentions display path, with its simulation-time ETA.
 * @typedef {Object} IntentionsPathPoint
 * @property {Coordinates} coords - Position of this waypoint
 * @property {number} eta - Simulation time (seconds) at which the ship reaches this point
 */

/**
 * An operator VHF note attached to a ship.
 * @typedef {Object} OperatorNote
 * @property {string} channel - VHF channel (e.g. "VHF60")
 * @property {string} location - Ship's location when the message was sent
 * @property {string} time - Relative timestamp (e.g. "10m 05s geleden")
 * @property {string} note - Contents of the message
 */

/**
 * Marker shape displayed for a ship on the radar/map.
 * @typedef {"hull" | "triangle"} MarkerType
 */

/**
 * Ship classification category.
 * - "Binnenvaart" — inland navigation
 * - "Zeevaart"    — sea-going navigation
 * - "Pleziervaart" — pleasure craft
 * @typedef {"Binnenvaart" | "Zeevaart" | "Pleziervaart"} ShipType
 */

/**
 * AIS status text from the database.
 * Note: this is NOT a direct mirror of `aisActive`. `aisActive` is a boolean
 * controlled by the operator (and can be toggled at runtime), while `aisStatus`
 * is the raw text value stored in the database (e.g. "Active", "Geen signaal").
 * They may diverge — `aisActive` reflects the current runtime state, whereas
 * `aisStatus` is the original DB snapshot.
 * @typedef {"Geen signaal" | "Active" | string} AisStatus
 */

/**
 * Verification status level for a ship, derived from AIS activity,
 * destination knowledge, and verification state.
 * - "red"    — Unknown: AIS off and/or no valid destination
 * - "yellow" — Partial: AIS on + destination known, but not verified
 * - "green"  — Full: AIS on + destination known + verified
 * @typedef {"red" | "yellow" | "green"} StatusLevel
 */

/**
 * A ship as returned by the API (`GET /api/scenarios/:id`).
 * This is the raw shape before any frontend enrichment.
 * @typedef {Object} RawShip
 * @property {number} id - Database primary key
 * @property {string} name - Ship's display name
 * @property {string|null} shortname - Abbreviated name used in map labels
 * @property {string|null} nationality - ISO country code (e.g. "DE", "NL")
 * @property {MarkerType} markerType - Icon shape on the map ("hull" or "triangle")
 * @property {ShipType|null} shipType - Navigation classification
 * @property {string|null} destination - Stated destination (may be "Unknown" or empty)
 * @property {string|null} cargo - Cargo description
 * @property {boolean} aisActive - Whether AIS is turned on (from DB)
 * @property {AisStatus|null} aisStatus - Raw AIS status text from DB
 * @property {number} speed - Speed in knots (default 0.0)
 * @property {Coordinates[]} waypoints - Planned route as [lat, lng] pairs
 * @property {OperatorNote[]} operatorNotes - VHF operator messages
 * @property {number} scenarioId - Parent scenario ID
 * @property {number} intentionsShareTime - Minutes of intentions to display ahead (default 10)
 * @property {boolean} intentionsShowComplete - Whether to show the full intention route
 * @property {boolean} intentionsShowActive - Whether intentions are initially visible (overridden by events at runtime)
 * @property {Coordinates[]} intentions - First intention route merged as flat coordinates (empty array if none)
 */

/**
 * A ship after API normalization (adds `dbId`).
 * @typedef {RawShip & { dbId: number }} NormalizedShip
 */

/**
 * Ship motion state computed by `computeShipPosition`.
 * @typedef {Object} ShipMotion
 * @property {Coordinates} position - Current [lat, lng] on the route
 * @property {number} heading - Current heading in degrees (0–360)
 * @property {number} currentWaypointIndex - Index of the next waypoint to reach (1-based)
 * @property {boolean} arrived - Whether the ship has reached its final waypoint
 * @property {number} baseSpeed - Effective speed in knots (fallback: 5)
 */

/**
 * Dynamic intentions display state computed by `useDynamicIntentionsDisplay`.
 * @typedef {Object} DynamicIntentionsState
 * @property {IntentionsPathPoint[]} displayPath - Visible portion of the intention route with ETAs
 * @property {Coordinates} intentionsPosition - Nearest point on the intention route to the ship
 * @property {number} currentIntentionsIndex - Index into the intention route at the cursor position
 */

/**
 * A fully enriched ship object as consumed by UI components.
 *
 * This merges: API data → normalization → motion computation →
 * intention visibility events → dynamic intentions → verification overrides → status.
 *
 * @typedef {Object} Ship
 *
 * // — Identity —
 * @property {number} id - Database primary key
 * @property {number} dbId - Normalized numeric ID (same as `id`, guaranteed number)
 * @property {string} name - Ship's display name
 * @property {string|null} shortname - Abbreviated name for map labels
 * @property {string|null} nationality - ISO country code
 *
 * // — Classification —
 * @property {MarkerType} markerType - Icon shape on the map
 * @property {ShipType|null} shipType - Navigation classification
 *
 * // — Voyage —
 * @property {string|null} destination - Current destination (may be overridden by verification PATCH)
 * @property {string|null} cargo - Cargo description
 * @property {number} scenarioId - Parent scenario ID
 *
 * // — AIS —
 * @property {boolean} aisActive - Whether AIS is currently active (runtime-togglable, may differ from DB `aisStatus`)
 * @property {AisStatus|null} aisStatus - Raw AIS status text from DB (informational; does not drive logic)
 *
 * // — Navigation —
 * @property {number} speed - Speed in knots
 * @property {Coordinates[]} waypoints - Planned route
 * @property {Coordinates} position - Current [lat, lng] position on the route
 * @property {number} heading - Current heading in degrees (0–360)
 * @property {number} baseHeading - Heading at the time of motion computation (alias for `heading`)
 * @property {number} currentWaypointIndex - Index of the next waypoint to reach
 * @property {boolean} arrived - Whether the ship has reached its final waypoint
 * @property {number} baseSpeed - Effective speed in knots
 *
 * // — Intentions (raw from API) —
 * @property {Coordinates[]} intentions - First intention route as flat coordinates
 * @property {number} intentionsShareTime - Minutes of intentions to display ahead (default 10)
 * @property {boolean} intentionsShowComplete - Whether to show the full intention route
 *
 * // — Intentions (runtime-computed) —
 * @property {boolean} intentionsShowActive - Whether intentions are currently visible (driven by ShowIntention/HideIntention events)
 * @property {IntentionsPathPoint[]} dynamicIntentionsPath - Visible portion of the intention route with ETAs
 * @property {Coordinates} intentionsPosition - Nearest point on the intention route to the ship
 * @property {number} currentIntentionsIndex - Index into the intention route at the cursor position
 *
 * // — Operator —
 * @property {OperatorNote[]} operatorNotes - VHF operator messages
 *
 * // — Verification (from /api/verifications) —
 * @property {boolean} verified - Whether the ship has been verified by the operator
 *
 * // — Status (derived) —
 * @property {StatusLevel} status - Aggregated verification status level
 *
 * // — Optional dimensions (DB columns, not yet in API query but referenced in UI) —
 * @property {number} [length] - Ship length in meters
 * @property {number} [width] - Ship width in meters
 * @property {number} [depth] - Ship depth in decimeters
 * @property {number} [rateOfTurn] - Rate of turn in degrees per minute
 */

/**
 * @typedef {Ship & { currentlyInSector: boolean, routeEntersSector: boolean }} InboundShip
 */

/**
 * A scenario as returned by the API.
 * @typedef {Object} Scenario
 * @property {number} id - Scenario primary key
 * @property {string} name - Scenario name
 * @property {string|null} description - Scenario description
 * @property {number} duration_seconds - Total scenario duration in seconds
 * @property {number|null} sector_id - Sector identifier
 * @property {Coordinates|null} start_coordinate - Initial map center [lat, lng]
 */

/**
 * An intention entry as returned by the API (grouped by ship).
 * @typedef {Object} Intention
 * @property {number} id - Intention primary key
 * @property {number} dbShipId - Normalized numeric ship ID this intention belongs to
 * @property {string|null} name - Intention name (e.g. "initieleroute")
 * @property {string|null} description - Intention description
 * @property {Coordinates[]} route - Intention route as [lat, lng] pairs
 */

/**
 * A scenario event as returned by the API.
 * @typedef {Object} ScenarioEvent
 * @property {number} id - Event primary key
 * @property {number} scenarioId - Parent scenario ID
 * @property {string} type - Event type (e.g. "SpawnShip", "ShowIntention", "HideIntention", "AlertIntentionChange")
 * @property {string} subjectType - Subject category (e.g. "ship", "intention")
 * @property {number} subjectId - ID of the subject entity
 * @property {number} triggerTime - Simulation time (seconds) at which the event fires
 */

/**
 * A verification row from `/api/verifications`.
 * @typedef {Object} Verification
 * @property {number|null} id - Verification row primary key
 * @property {string} ship_id - Normalized app-facing ship ID (string)
 * @property {boolean} verified - Whether the ship has been verified
 * @property {string|null} destination - Operator-confirmed destination
 */

/**
 * The full scenario bundle returned by `GET /api/scenarios/:id`.
 * @typedef {Object} ScenarioBundle
 * @property {Scenario} scenario - Scenario metadata
 * @property {RawShip[]} ships - Ships in this scenario
 * @property {Object<string, Intention[]>} intentions_by_ship_id - Intentions keyed by ship ID string
 * @property {ScenarioEvent[]} events - Timed scenario events
 */

/**
 * Normalized scenario data as produced by `useScenarioData`.
 * @typedef {Object} NormalizedScenarioData
 * @property {Scenario|null} scenario - Scenario metadata
 * @property {NormalizedShip[]} ships - Normalized ships
 * @property {Intention[]} intentions - Flattened intentions list
 * @property {ScenarioEvent[]} events - Normalized events
 */

/**
 * An active intention-change alert for display.
 * @typedef {Object} IntentionChangeAlert
 * @property {number} key - Event ID (for React key)
 * @property {string} shipName - Display name of the ship
 */

/**
 * @typedef {Object} ShipsContextValue
 * @property {Ship[]} ships - Fully enriched ships for the current sim time
 * @property {number|null} selectedShipId - Currently selected ship's id
 * @property {Ship|null} selectedShip - The selected ship object
 * @property {Intention[]} intentions - All intentions for the scenario
 * @property {(id: number|null) => void} selectShip - Select/deselect a ship
 * @property {(id: number, dest: string) => Promise<void>} setDestination - Set a ship's destination (also verifies)
 * @property {(id: number) => Promise<void>} verifyShip - Verify a ship
 * @property {(id: number, verified: boolean) => Promise<void>} toggleShipVerification - Toggle verification
 * @property {(id: number) => Promise<void>} resetShip - Reset a ship to red status
 * @property {string|null} verificationError - Last verification error message
 */

/**
 * @typedef {Object} SimContextValue
 * @property {number} simTime - Current simulation time in seconds
 * @property {number} duration - Total scenario duration in seconds
 * @property {boolean} isPlaying - Whether the simulation is running
 * @property {number} timeScale - Time scale factor (e.g. 4 = 4× real-time)
 * @property {number} startTime - Real-world start time as epoch ms
 * @property {number} currentTime - Current real-world time as epoch ms
 * @property {Map<number, number>} spawnTimes - Map of ship id → spawn sim time
 * @property {IntentionChangeAlert[]} activeIntentionChangeAlerts - Currently visible alerts
 * @property {() => void} play - Start/resume playback
 * @property {() => void} pause - Pause playback
 * @property {(time: number) => void} seek - Seek to a specific sim time
 * @property {() => void} restart - Reset to time 0 and play
 * @property {(scale: number) => void} setTimeScale - Change the time scale
 */

/**
 * @typedef {Object} ScenarioContextValue
 * @property {number|null} scenarioId - Active scenario ID
 * @property {Scenario|null} scenario - Scenario metadata
 * @property {NormalizedShip[]} originalShips - Immutable copies of original ship data
 * @property {Intention[]} originalIntentions - Immutable copies of original intention data
 * @property {ScenarioEvent[]} originalEvents - Immutable copies of original event data
 * @property {NormalizedShip[]} ships - Live (mutable) ship references
 * @property {Intention[]} intentions - Live (mutable) intention references
 * @property {ScenarioEvent[]} events - Live (mutable) event references
 * @property {boolean} loading - Whether the scenario is loading
 * @property {string|null} error - Load error message
 */
