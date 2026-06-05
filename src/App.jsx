import { useState, useMemo, useEffect } from "react";
import AppLayout from "@components/layout/AppLayout";
import VTSMap from "@components/map/VTSMap";
import ScenarioSelect from "@components/ScenarioSelect";
import SectorSelect from "@components/SectorSelect";
import TimelineControls from "@components/panels/TimelineControls";
import InboundPanel from "@components/panels/InboundPanel";
import ShipInfoCard from "@components/panels/ShipInfoCard";
import { ScenarioProvider, useScenario } from "@contexts/ScenarioContext";
import { SimProvider, useSim } from "@contexts/SimContext";
import { ShipsProvider, useShips } from "@contexts/ShipsContext";
import IntentionChangeAlertStack from "@components/alerts/IntentionChangeAlertStack";
import { SECTORS } from "@data/sectors";
import { API_URL, ENDPOINT_DESTINATIONS } from "@utils/api";
import "./App.css";

function AppContent({ activeSector, destinations, onBack }) {
  const { scenario, loading, error, originalShips } = useScenario();
  const {
    simTime,
    duration,
    activeIntentionChangeAlerts,
    isPlaying,
    play,
    pause,
    seek,
    restart,
  } = useSim();
  const {
    ships,
    selectedShipId,
    selectedShip,
    selectShip,
    setDestination,
    verifyShip,
    toggleShipVerification,
    resetShip,
    verificationError,
  } = useShips();

  const scenarioFocus = useMemo(() => {
    const points = [];
    for (const s of originalShips || []) {
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
  }, [originalShips]);

  if (loading) {
    return (
      <div className="sector-select-overlay">
        <div className="sector-select-card">
          <h1 className="sector-select-title">VTS ROTTERDAM</h1>
          <p className="sector-select-subtitle">Scenario laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sector-select-overlay">
        <div className="sector-select-card">
          <h1 className="sector-select-title">VTS ROTTERDAM</h1>
          <p className="scenario-status scenario-status-error">
            Scenario laden mislukt: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      onBack={onBack}
      topCenterAlerts={
        <IntentionChangeAlertStack alerts={activeIntentionChangeAlerts} />
      }
      map={
        <VTSMap
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={selectShip}
          activeSector={activeSector}
          scenarioFocus={scenarioFocus}
          simTime={simTime}
        />
      }
      inboundPanel={
        <InboundPanel
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={selectShip}
          onToggleShipVerification={toggleShipVerification}
          activeSector={activeSector}
        />
      }
      shipInfoCard={
        <ShipInfoCard
          ship={selectedShip}
          activeSector={activeSector}
          onClose={() => selectShip(null)}
          onSetDestination={setDestination}
          onVerifyShip={verifyShip}
          onResetShip={resetShip}
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

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [activeSector, setActiveSector] = useState(null);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/${ENDPOINT_DESTINATIONS}`)
      .then((res) => res.json())
      .then((data) => setDestinations(data))
      .catch((err) => console.error("Failed to load destinations:", err));
  }, []);

  const handleBack = () => {
    setActiveScenarioId(null);
    setActiveSector(null);
  };

  if (activeScenarioId == null) {
    return <ScenarioSelect onSelect={setActiveScenarioId} />;
  }

  if (!activeSector) {
    return <SectorSelect onSelect={(sector) => setActiveSector(sector)} />;
  }

  return (
    <ScenarioProvider scenarioId={activeScenarioId} sector={activeSector}>
      <SimProvider>
        <ShipsProvider>
          <AppContent
            activeSector={activeSector}
            destinations={destinations}
            onBack={handleBack}
          />
        </ShipsProvider>
      </SimProvider>
    </ScenarioProvider>
  );
}
