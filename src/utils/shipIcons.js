import L from "leaflet";
import { STATUS } from "@utils/status";

const FILL = "#FB8C00";
const FILL_SEL = "#FFA726";

// Ship-dimension fallbacks (meters) when the DB has no size for a vessel.
const DEFAULT_LENGTH_M = 70;
const DEFAULT_WIDTH_M = 9;

// Relative size mapping: inland vessels roughly span 38m (spits) to 135m
// (large motor vessel). We map that range to a modest pixel length so larger
// ships read as bigger without overlapping neighbours at the scenario zoom.
const MIN_LEN_M = 38;
const MAX_LEN_M = 135;
const MIN_LEN_PX = 20;
const MAX_LEN_PX = 42;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Map a ship's real length/width (meters) to on-screen hull dimensions (px).
 * @param {number} lengthM
 * @param {number} widthM
 * @param {boolean} isSelected
 * @returns {{ lengthPx: number, widthPx: number }}
 */
function hullPixelSize(lengthM, widthM, isSelected) {
  const len = clamp(lengthM || DEFAULT_LENGTH_M, MIN_LEN_M, MAX_LEN_M);
  const wid = widthM || DEFAULT_WIDTH_M;
  let lengthPx =
    MIN_LEN_PX +
    ((len - MIN_LEN_M) / (MAX_LEN_M - MIN_LEN_M)) * (MAX_LEN_PX - MIN_LEN_PX);
  // Slender hull: beam scales with the real width/length ratio but stays
  // visually thin (roughly a 4:1 hull) so ships read as vessels, not blobs.
  const beamRatio = clamp(wid / len, 0.06, 0.2);
  let widthPx = clamp(lengthPx * beamRatio * 1.9, 6, 13);
  if (isSelected) {
    lengthPx *= 1.15;
    widthPx *= 1.15;
  }
  return { lengthPx, widthPx };
}

/**
 * Convert real-world travel minutes → simulation seconds.
 * @param {number} minutes
 * @param {number} timeScale
 * @returns {number}
 */
export function travelMinutesToSimSeconds(minutes, timeScale) {
  return (minutes * 60) / timeScale;
}

/**
 * Convert simulation seconds → real-world minutes.
 * @param {number} simSec
 * @param {number} timeScale
 * @returns {number}
 */
export function simSecondsToTravelMinutes(simSec, timeScale) {
  return (simSec * timeScale) / timeScale;
}

/**
 * Convert sim-seconds to a real-world Date.
 * @param {number} simSec - Simulation time in seconds
 * @param {number} timeScale - Time scale factor
 * @param {number} startTimeMs - Real-world start time as epoch ms
 * @returns {Date}
 */
export function simTimeToClock(simSec, timeScale, startTimeMs) {
  return new Date(startTimeMs + simSec * timeScale * 1000);
}

/**
 * Format a Date as HH:MM in local time.
 * @param {Date} date
 * @returns {string}
 */
export function formatClockTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Compute ETA markers along an intentions display path at regular clock-time intervals.
 *
 * @param {IntentionsPathPoint[]} displayPath - Path with ETAs
 * @param {number} intervalMinutes - Interval between markers in real-world minutes (e.g. 5)
 * @param {number} timeScale - Simulation time scale factor
 * @param {number} startTimeMs - Real-world start time as epoch ms
 * @returns {ETAMarker[]} ETA markers with positions and labels
 */
export function computeETAMarkers(
  displayPath,
  intervalMinutes,
  timeScale,
  startTimeMs,
) {
  if (!displayPath || displayPath.length < 2) return [];

  const startEta = displayPath[0].eta;
  const endEta = displayPath[displayPath.length - 1].eta;

  const startClock = simTimeToClock(startEta, timeScale, startTimeMs);

  const startTotalMin = startClock.getHours() * 60 + startClock.getMinutes();
  const startSec = startClock.getSeconds();
  const firstBoundaryMin =
    startSec > 0
      ? (Math.floor(startTotalMin / intervalMinutes) + 1) * intervalMinutes
      : Math.ceil(startTotalMin / intervalMinutes) * intervalMinutes;

  if (startSec === 0 && startTotalMin % intervalMinutes === 0) {
    // firstBoundaryMin is already startTotalMin, which is correct
  }

  const endClock = simTimeToClock(endEta, timeScale, startTimeMs);

  const endTotalMin = endClock.getHours() * 60 + endClock.getMinutes();
  const endDayMs = new Date(endClock).setHours(0, 0, 0, 0);
  const startDayMs = new Date(startClock).setHours(0, 0, 0, 0);
  const dayOffset = Math.round((endDayMs - startDayMs) / 86400000);
  const endBoundaryMin = endTotalMin + dayOffset * 1440;

  /** @type {ETAMarker[]} */
  const markers = [];
  let boundaryMin = firstBoundaryMin;

  while (boundaryMin <= endBoundaryMin) {
    const dayNum = Math.floor(boundaryMin / 1440);
    const minInDay = boundaryMin % 1440;
    const boundaryDate = new Date(startClock);
    boundaryDate.setDate(boundaryDate.getDate() + dayNum);
    boundaryDate.setHours(Math.floor(minInDay / 60), minInDay % 60, 0, 0);

    const boundarySimTime =
      (boundaryDate.getTime() - startTimeMs) / (timeScale * 1000);

    if (boundarySimTime < startEta) {
      boundaryMin += intervalMinutes;
      continue;
    }
    if (boundarySimTime > endEta) break;

    /** @type {Coordinates|null} */
    let coords = null;
    for (let i = 1; i < displayPath.length; i++) {
      const prev = displayPath[i - 1];
      const curr = displayPath[i];
      if (boundarySimTime >= prev.eta && boundarySimTime <= curr.eta) {
        const denom = curr.eta - prev.eta;
        const fraction = denom > 0 ? (boundarySimTime - prev.eta) / denom : 0;
        const lat =
          prev.coords[0] + (curr.coords[0] - prev.coords[0]) * fraction;
        const lng =
          prev.coords[1] + (curr.coords[1] - prev.coords[1]) * fraction;
        coords = [lat, lng];
        break;
      }
    }

    if (coords) {
      markers.push({
        coords,
        eta: boundarySimTime,
        label: formatClockTime(boundaryDate),
      });
    }

    boundaryMin += intervalMinutes;
  }

  // Always add end-of-path marker
  const lastEntry = displayPath[displayPath.length - 1];
  const lastClock = simTimeToClock(lastEntry.eta, timeScale, startTimeMs);
  const lastLabel = formatClockTime(lastClock);
  const alreadyPlaced =
    markers.length > 0 && markers[markers.length - 1].label === lastLabel;
  if (!alreadyPlaced) {
    markers.push({
      coords: lastEntry.coords,
      eta: lastEntry.eta,
      label: lastLabel,
    });
  }

  return markers;
}

/**
 * Create a small divIcon for an ETA label.
 * @param {string} label - Clock time label (e.g. "14:35")
 * @param {string} [color="#bb47ff"] - Text color
 * @returns {L.DivIcon}
 */
export function createETAIcon(label, color = "#bb47ff") {
  const width = 40;
  return L.divIcon({
    html: `<div class="eta-label" style="color:${color}">${label}</div>`,
    className: "eta-label-icon",
    iconSize: [width, 0],
    iconAnchor: [width / 2, -2],
  });
}

/**
 * Compute a perpendicular hatch mark at a given position along the intentions line.
 * @param {Coordinates} coords - Position to place the hatch
 * @param {Coordinates[]} intentionsPositions - Full intentions polyline
 * @param {number} [hatchLengthPx=0.5] - Hatch length in pixels (approximate)
 * @returns {Coordinates[]|null} Two points forming the hatch, or null
 */
export function computeHatchMark(
  coords,
  intentionsPositions,
  hatchLengthPx = 0.5,
) {
  let minDist = Infinity;
  /** @type {Coordinates[]|null} */
  let bestSegment = null;

  for (let i = 0; i < intentionsPositions.length - 1; i++) {
    const a = intentionsPositions[i];
    const b = intentionsPositions[i + 1];
    const midLat = (a[0] + b[0]) / 2;
    const midLng = (a[1] + b[1]) / 2;
    const dLat = coords[0] - midLat;
    const dLng = coords[1] - midLng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      bestSegment = [a, b];
    }
  }

  if (!bestSegment) return null;

  const dx = bestSegment[1][1] - bestSegment[0][1];
  const dy = bestSegment[1][0] - bestSegment[0][0];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const perpLat = -dx / len;
  const perpLng = dy / len;
  const hatchLengthDeg = hatchLengthPx * 0.00015;

  return [
    [
      coords[0] - perpLat * hatchLengthDeg,
      coords[1] - perpLng * hatchLengthDeg,
    ],
    [
      coords[0] + perpLat * hatchLengthDeg,
      coords[1] + perpLng * hatchLengthDeg,
    ],
  ];
}

/**
 * Create a triangle (pleziervaart) ship icon rotated to the given heading.
 * @param {number} heading - Heading in degrees
 * @param {boolean} isSelected - Whether the ship is selected
 * @returns {L.DivIcon}
 */
export function createTriangleIcon(heading, isSelected) {
  const size = isSelected ? 20 : 16;
  const half = size / 2;
  const fill = isSelected ? FILL_SEL : FILL;
  const stroke = isSelected ? "#FFFFFF" : "rgba(255,255,255,0.85)";
  const sw = isSelected ? 2.2 : 0.9;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 18 18" 
xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${heading}, 9, 9)">
      <path d="M 9,2 C 11.5,5 14,10 13.5,14 C 13,15.5 11,14.5 9,12.5
               C 7,14.5 5,15.5 4.5,14 C 4,10 6.5,5 9,2 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-
linejoin="round"/>
    </g></svg>`;

  return L.divIcon({
    html: svg,
    className: "ship-icon",
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

/**
 * Create a hull (binnenvaart/zeevaart) ship icon rotated to the given heading,
 * scaled to the vessel's real length/width and filled orange.
 *
 * @param {number} heading - Heading in degrees
 * @param {boolean} isSelected - Whether the ship is selected
 * @param {number} [lengthM] - Ship length in meters (from DB)
 * @param {number} [widthM] - Ship beam in meters (from DB)
 * @returns {L.DivIcon}
 */
export function createHullIcon(heading, isSelected, lengthM, widthM) {
  const { lengthPx, widthPx } = hullPixelSize(lengthM, widthM, isSelected);
  const fill = isSelected ? FILL_SEL : FILL;
  const stroke = isSelected ? "#FFFFFF" : "rgba(255,255,255,0.85)";
  const sw = isSelected ? 2.2 : 0.9;

  const size = Math.ceil(lengthPx) + 4;
  const c = size / 2;
  const ht = widthPx / 2;
  const sternX = c - lengthPx / 2;
  const bowTipX = c + lengthPx / 2;
  const bowBaseX = bowTipX - lengthPx * 0.24;

  const r = (n) => Math.round(n * 100) / 100;
  const rot = heading - 90;
  const path =
    `M ${r(sternX)},${r(c - ht)} ` +
    `L ${r(bowBaseX)},${r(c - ht)} ` +
    `Q ${r(bowTipX)},${r(c)} ${r(bowBaseX)},${r(c + ht)} ` +
    `L ${r(sternX)},${r(c + ht)} Z`;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${rot}, ${r(c)}, ${r(c)})">
      <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    </g></svg>`;

  return L.divIcon({
    html: svg,
    className: "ship-icon",
    iconSize: [size, size],
    iconAnchor: [c, c],
  });
}

/**
 * Create a draggable label icon for a ship marker.
 * Shows shortname, status indicators, and optional expanded info.
 *
 * @param {Ship} ship - Enriched ship object
 * @param {boolean} expandLabel - Whether to show expanded info (dimensions, speed, destination)
 * @returns {L.DivIcon}
 */
export function createLabelIcon(ship, expandLabel) {
  const hasDimensions =
    ship.length !== undefined ||
    ship.width !== undefined ||
    ship.depth !== undefined;
  const verifiedIcon = `<svg width="6" height="6" viewBox="0 0 6 6" fill="none" 
xmlns="http://www.w3.org/2000/svg">
<<circle cx="2.74382" cy="2.74382" r="2.74382" 
fill="${STATUS[ship.status].color}"/>
</svg>`;
  const labelTitle = `<span class="ship-label-text">${
    ship.status === "green" ? verifiedIcon : ""
  }${ship.intentionsShowActive ? "#" : ""}${
    ship.shipType === "Zeevaart" ? "+" : ""
  }${ship.shortname.toUpperCase()}${
    ship.aisActive ? "+" : ""
  }${ship.operatorNotes && ship.operatorNotes.length > 0 ? "#" : ""} 
${expandLabel ? ship.name : ""}</span>`;
  const labelExpandedInfo = `${
    hasDimensions
      ? `<span class="ship-label-text">${ship.length ?? "NaN"}m ${ship.width ?? "NaN"}m ${
          ship.depth ?? "NaN"
        }dm</span>`
      : ""
  }<span class="ship-label-text">${ship.speed ?? "NaN"}kn 
${ship.baseHeading.toFixed(1) ?? "NaN"}° ${
    ship.rateOfTurn !== undefined ? `${ship.rateOfTurn}°/min` : ""
  }</span><span class="ship-label-text">${ship.shipType === "Zeevaart" ? "Z" : "B"} ${ship.destination} 
${ship.status === "green" ? verifiedIcon : ""}</span>`;
  return L.divIcon({
    html: `<div class="ship-label-container">${labelTitle}${
      expandLabel ? labelExpandedInfo : ""
    }</div>`,
    className: "ship-label-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 6],
  });
}

/**
 * Convert a pixel offset from a map origin to a LatLng position.
 * @param {L.Map} map - Leaflet map instance
 * @param {Coordinates} origin - Origin [lat, lng]
 * @param {[number, number]} pxOffset - Pixel offset [x, y]
 * @returns {L.LatLng}
 */
export function pixelOffsetToLatLng(map, origin, pxOffset) {
  const originPx = map.latLngToContainerPoint(origin);
  const targetPx = L.point(originPx.x + pxOffset[0], originPx.y + pxOffset[1]);
  return map.containerPointToLatLng(targetPx);
}
