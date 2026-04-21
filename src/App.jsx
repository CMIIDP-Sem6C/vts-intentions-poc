import { useState, useCallback, useMemo } from 'react';
import AppLayout from './components/layout/AppLayout';
import VTSMap from './components/map/VTSMap';
import InboundPanel from './components/panels/InboundPanel';
import ShipInfoCard from './components/panels/ShipInfoCard';
import SectorSelect from './components/SectorSelect';
import useShipSimulation from './hooks/useShipSimulation';
import { MOCK_SHIPS, MOORED_SHIPS } from './data/mockShips';
import './App.css';

export default function App() {
  const [activeSector, setActiveSector] = useState(null);
  const simulatedShips = useShipSimulation(MOCK_SHIPS);

  const [selectedShipId, setSelectedShipId] = useState(null);

  const [destinationMap, setDestinationMap] = useState({});
  const [aisActiveMap, setAisActiveMap] = useState(() => {
    const m = {};
    MOCK_SHIPS.forEach((s) => { m[s.id] = s.aisActive; });
    return m;
  });

  const [mooredShips, setMooredShips] = useState(() =>
    MOORED_SHIPS.map((ms) => ({ ...ms }))
  );
  const [selectedMooredId, setSelectedMooredId] = useState(null);

  const ships = useMemo(
    () =>
      simulatedShips.map((ship) => ({
        ...ship,
        destination: destinationMap[ship.id] || ship.destination,
        aisActive: aisActiveMap[ship.id] ?? ship.aisActive,
      })),
    [simulatedShips, destinationMap, aisActiveMap]
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

  const handleSetDestination = useCallback((id, dest) => {
    setDestinationMap((prev) => ({ ...prev, [id]: dest }));
  }, []);

  const handleScanAIS = useCallback((id) => {
    setAisActiveMap((prev) => ({ ...prev, [id]: true }));
  }, []);

  const handleSelectMoored = useCallback((id) => {
    setSelectedMooredId((prev) => (prev === id ? null : id));
    setSelectedShipId(null);
  }, []);

  const handleUpdateMoored = useCallback((id, updates) => {
    setMooredShips((prev) =>
      prev.map((ms) => (ms.id === id ? { ...ms, ...updates } : ms))
    );
  }, []);

  if (!activeSector) {
    return <SectorSelect onSelect={setActiveSector} />;
  }

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
          activeSector={activeSector}
        />
      }
      inboundPanel={
        <InboundPanel
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
        />
      }
      shipInfoCard={
        <ShipInfoCard
          ship={selectedShip}
          onClose={handleCloseInfo}
          onSetDestination={handleSetDestination}
          onScanAIS={handleScanAIS}
        />
      }
    />
  );
}
