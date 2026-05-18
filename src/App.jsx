import { useEffect, useState, useCallback, useMemo } from "react";
import AppLayout from "./components/layout/AppLayout";
import VTSMap from "./components/map/VTSMap";
import ScenarioSelect from "./components/ScenarioSelect";
import SectorSelect from "./components/SectorSelect";
import TimelineControls from "./components/panels/TimelineControls";
import InboundPanel from "./components/panels/InboundPanel";
import ShipInfoCard from "./components/panels/ShipInfoCard";
import useScenarioData from "./hooks/useScenarioData";
import useVerificationSync from "./hooks/useVerificationSync";
import useScenarioSimulation from "./hooks/useScenarioSimulation";
import { API_URL, ENDPOINT_DESTINATIONS } from "./utils/api";
import "./App.css";

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [activeSector, setActiveSector] = useState(null);

  const { verificationByShipId, updateVerification, verificationError } =
    useVerificationSync();

  const {
    data: scenarioData,
    loading: scenarioLoading,
    error: scenarioError,
  } = useScenarioData(activeScenarioId);

  const activeScenarioData = activeSector ? scenarioData : null;

  const {
    ships: simulatedShips,
    simTime,
    duration,
    isPlaying,
    play,
    pause,
    seek,
    restart,
  } = useScenarioSimulation(activeScenarioData);

  const [selectedShipId, setSelectedShipId] = useState(null);
  const [aisActiveMap, setAisActiveMap] = useState({});
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/${ENDPOINT_DESTINATIONS}`)
      .then((res) => res.json())
      .then((data) => setDestinations(data))
      .catch((err) => console.error("Failed to load destinations:", err));
  }, []);

  useEffect(() => {
    if (!scenarioData?.ships) return;
    setAisActiveMap((prev) => {
      const next = { ...prev };
      scenarioData.ships.forEach((s) => {
        if (!(s.id in next)) next[s.id] = s.aisActive;
      });
      return next;
    });
  }, [scenarioData]);

  const ships = useMemo(
    () =>
      simulatedShips.map((ship) => ({
        ...ship,
        destination:
          verificationByShipId[ship.id]?.destination ?? ship.destination,
        verified: verificationByShipId[ship.id]?.verified ?? false,
        aisActive: aisActiveMap[ship.id] ?? ship.aisActive,
      })),
    [simulatedShips, verificationByShipId, aisActiveMap],
  );

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId],
  );

  const scenarioFocus = useMemo(() => {
    const points = [];
    for (const s of scenarioData?.ships || []) {
      if (Array.isArray(s.waypoints) && s.waypoints.length > 0) {
        points.push(...s.waypoints.slice(0, 5));
      }
    }
    if (points.length === 0) return null;
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const center = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const span = Math.max(latSpan, lngSpan * 0.62);
    const zoom = span > 0.05 ? 13 : span > 0.025 ? 14 : 15;
    return { center, zoom };
  }, [scenarioData]);

  const handleSelectShip = useCallback((id) => {
    setSelectedShipId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseInfo = useCallback(() => {
    setSelectedShipId(null);
  }, []);

  const handleSetDestination = useCallback(
    async (id, dest) => {
      try {
        await updateVerification(id, { destination: dest, verified: true });
      } catch (_error) {
        // Polling loop will retry.
      }
    },
    [updateVerification],
  );

  const handleVerifyShip = useCallback(
    async (id) => {
      try {
        await updateVerification(id, { verified: true });
      } catch (_error) {
        // Polling loop will retry.
      }
    },
    [updateVerification],
  );

  const handleToggleShipVerification = useCallback(
    async (id, verified) => {
      try {
        await updateVerification(id, { verified });
      } catch (_error) {
        // Polling loop will retry.
      }
    },
    [updateVerification],
  );

  const handleResetShip = useCallback(
    async (id) => {
      setAisActiveMap((prev) => ({ ...prev, [id]: false }));
      try {
        await updateVerification(id, {
          verified: false,
          destination: "Unknown",
        });
      } catch (_error) {
        // DB down -> alleen lokaal gereset.
      }
    },
    [updateVerification],
  );

  if (activeScenarioId == null) {
    return <ScenarioSelect onSelect={setActiveScenarioId} />;
  }

  if (!activeSector) {
    return <SectorSelect onSelect={(sector) => setActiveSector(sector)} />;
  }

  if (scenarioLoading) {
    return (
      <div className="sector-select-overlay">
        <div className="sector-select-card">
          <h1 className="sector-select-title">VTS ROTTERDAM</h1>
          <p className="sector-select-subtitle">Scenario laden...</p>
        </div>
      </div>
    );
  }

  if (scenarioError) {
    return (
      <div className="sector-select-overlay">
        <div className="sector-select-card">
          <h1 className="sector-select-title">VTS ROTTERDAM</h1>
          <p className="scenario-status scenario-status-error">
            Scenario laden mislukt: {scenarioError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      map={
        <VTSMap
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
          activeSector={activeSector}
          scenarioFocus={scenarioFocus}
        />
      }
      inboundPanel={
        <InboundPanel
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
          onToggleShipVerification={handleToggleShipVerification}
          activeSector={activeSector}
        />
      }
      shipInfoCard={
        <ShipInfoCard
          ship={selectedShip}
          onClose={handleCloseInfo}
          onSetDestination={handleSetDestination}
          onVerifyShip={handleVerifyShip}
          onResetShip={handleResetShip}
          verificationError={verificationError}
          destinations={destinations}
        />
      }
      bottomBar={
        <TimelineControls
          simTime={simTime}
          duration={duration}
          isPlaying={isPlaying}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onRestart={restart}
        />
      }
    />
  );
}
