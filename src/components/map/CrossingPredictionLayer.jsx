import { useEffect, useMemo, useState } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { useScenario } from "@contexts/ScenarioContext";
import { useSim } from "@contexts/SimContext";
import { useShips } from "@contexts/ShipsContext";

/** @typedef {{ id: string, ship_ids: number[], position: [number, number], distance_m: number, trigger_time: number, active_from: number, active_until: number }} CrossingPrediction */

const crossingBubbleIcon = L.divIcon({
  html: `
    <div class="crossing-alert-bubble" aria-hidden="true">
      <div class="crossing-alert-bubble__halo"></div>
      <div class="crossing-alert-bubble__pin">
        <div class="crossing-alert-bubble__head">
          <div class="crossing-alert-bubble__mark"></div>
          <div class="crossing-alert-bubble__dot"></div>
        </div>
        <div class="crossing-alert-bubble__stem"></div>
      </div>
    </div>
  `,
  className: "crossing-alert-bubble-icon",
  iconSize: [50, 50],
  iconAnchor: [25, 50],
});

/**
 * @param {CrossingPrediction[]} predictions
 * @param {import("../types").Ship[]} ships
 * @param {number} simTime
 * @returns {CrossingPrediction[]}
 */
function getVisibleCrossingPredictions(predictions, ships) {
  const sharedShipIds = new Set(
    ships
      .filter((ship) => ship.intentionsShowActive)
      .map((ship) => Number(ship.id)),
  );

  return predictions.filter((prediction) =>
    prediction.ship_ids.every((id) => sharedShipIds.has(Number(id))),
  );
}

/**
 * Fetch crossing predictions from the API and render alert bubbles on the map.
 */
export default function CrossingPredictionLayer() {
  const { scenarioId } = useScenario();
  const { timeScale } = useSim();
  const { ships } = useShips();
  /** @type {[CrossingPrediction[], React.Dispatch<React.SetStateAction<CrossingPrediction[]>>]} */
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    if (scenarioId == null) {
      setPredictions([]);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      threshold_m: "200",
      time_scale: String(timeScale),
    });

    fetch(
      `/api/scenarios/${scenarioId}/intention-crossing-predictions?${params}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setPredictions(Array.isArray(payload.predictions) ? payload.predictions : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load crossing predictions:", err);
        setPredictions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioId, timeScale]);

  const visiblePredictions = useMemo(
    () => getVisibleCrossingPredictions(predictions, ships),
    [predictions, ships],
  );

  return (
    <>
      {visiblePredictions.map((prediction) => (
        <Marker
          key={prediction.id}
          position={prediction.position}
          icon={crossingBubbleIcon}
          interactive={false}
        />
      ))}
    </>
  );
}
