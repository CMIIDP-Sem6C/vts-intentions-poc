import { useEffect, useState, useCallback, useMemo } from "react";
import AppLayout from "./components/layout/AppLayout";
import VTSMap from "./components/map/VTSMap";
import InboundPanel from "./components/panels/InboundPanel";
import ShipInfoCard from "./components/panels/ShipInfoCard";
import useVerificationSync from './hooks/useVerificationSync';
import ScenarioSelect from './components/ScenarioSelect';
import SectorSelect from './components/SectorSelect';
import useScenarioData from './hooks/useScenarioData';
import useScenarioSimulation from './hooks/useScenarioSimulation';
import { API_URL, ENDPOINT_DESTINATIONS } from "./utils/api";
import "./App.css";

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [activeSector, setActiveSector] = useState(null);

  const {
    verificationByShipId,
    updateVerification,
    verificationError,
  } = useVerificationSync();

  const { data: scenarioData, loading: scenarioLoading, error: scenarioError } =
    useScenarioData(activeScenarioId);

  const activeScenarioData = activeSector ? scenarioData : null;

  const { ships: simulatedShips, visibleIntentions } =
    useScenarioSimulation(activeScenarioData);

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
        destination: verificationByShipId[ship.id]?.destination ?? ship.destination,
        verified: verificationByShipId[ship.id]?.verified ?? false,
        aisActive: aisActiveMap[ship.id] ?? ship.aisActive,
      })),
    [simulatedShips, verificationByShipId, aisActiveMap],
  );

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId],
  );

  const handleSelectShip = useCallback((id) => {
    setSelectedShipId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseInfo = useCallback(() => {
    setSelectedShipId(null);
  }, []);

  const handleSetDestination = useCallback(async (id, dest) => {
    try {
      await updateVerification(id, { destination: dest, verified: true });
    } catch (_error) {
      // Polling loop will retry and show server error in UI.
    }
  }, [updateVerification]);

  const handleVerifyShip = useCallback(async (id) => {
    try {
      await updateVerification(id, { verified: true });
    } catch (_error) {
      // Polling loop will retry and show server error in UI.
    }
  }, [updateVerification]);

  const handleToggleShipVerification = useCallback(async (id, verified) => {
    try {
      await updateVerification(id, { verified });
    } catch (_error) {
      // Polling loop will retry and show server error in UI.
    }
  }, [updateVerification]);

  const handleResetShip = useCallback(async (id) => {
    setAisActiveMap((prev) => ({ ...prev, [id]: false }));
    try {
      await updateVerification(id, { verified: false, destination: 'Unknown' });
    } catch (_error) {
      // DB down -> alleen lokaal gereset.
    }
  }, [updateVerification]);

  if (activeScenarioId == null) {
    return <ScenarioSelect onSelect={setActiveScenarioId} />;
  }

  if (!activeSector) {
    return <SectorSelect onSelect={setActiveSector} />;
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
          intentions={visibleIntentions}
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
    />
  );
}
