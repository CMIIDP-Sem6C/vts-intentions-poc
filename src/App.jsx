import { useState, useCallback, useMemo } from 'react';
import AppLayout from './components/layout/AppLayout';
import VTSMap from './components/map/VTSMap';
import InboundPanel from './components/panels/InboundPanel';
import ShipInfoCard from './components/panels/ShipInfoCard';
import useShipSimulation from './hooks/useShipSimulation';
import useVerificationSync from './hooks/useVerificationSync';
import { MOCK_SHIPS, MOORED_SHIPS } from './data/mockShips';
import './App.css';

export default function App() {
  const simulatedShips = useShipSimulation(MOCK_SHIPS);
  const {
    verificationByShipId,
    updateVerification,
    verificationError,
  } = useVerificationSync();

  const [selectedShipId, setSelectedShipId] = useState(null);

  const [mooredShips, setMooredShips] = useState(() =>
    MOORED_SHIPS.map((ms) => ({ ...ms }))
  );
  const [selectedMooredId, setSelectedMooredId] = useState(null);

  const ships = useMemo(
    () =>
      simulatedShips.map((ship) => ({
        ...ship,
        destination: verificationByShipId[ship.id]?.destination ?? ship.destination,
        verified: verificationByShipId[ship.id]?.verified ?? false,
      })),
    [simulatedShips, verificationByShipId]
  );

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId]
  );

  const handleSelectShip = useCallback((id) => {
    setSelectedShipId((prev) => (prev === id ? null : id));
    setSelectedMooredId(null);
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

  const handleSelectMoored = useCallback((id) => {
    setSelectedMooredId((prev) => (prev === id ? null : id));
    setSelectedShipId(null);
  }, []);

  const handleUpdateMoored = useCallback((id, updates) => {
    setMooredShips((prev) =>
      prev.map((ms) => (ms.id === id ? { ...ms, ...updates } : ms))
    );
  }, []);

  return (
    <AppLayout
      map={
        <VTSMap
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
          mooredShips={mooredShips}
          selectedMooredId={selectedMooredId}
          onSelectMoored={handleSelectMoored}
          onUpdateMoored={handleUpdateMoored}
        />
      }
      inboundPanel={
        <InboundPanel
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
          onToggleShipVerification={handleToggleShipVerification}
        />
      }
      shipInfoCard={
        <ShipInfoCard
          ship={selectedShip}
          onClose={handleCloseInfo}
          onSetDestination={handleSetDestination}
          onVerifyShip={handleVerifyShip}
          verificationError={verificationError}
        />
      }
    />
  );
}
