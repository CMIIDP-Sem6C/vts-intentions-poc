import { useState, useCallback, useMemo } from 'react';
import AppLayout from './components/layout/AppLayout';
import VTSMap from './components/map/VTSMap';
import InboundPanel from './components/panels/InboundPanel';
import ShipInfoCard from './components/panels/ShipInfoCard';
import useShipSimulation from './hooks/useShipSimulation';
import { MOCK_SHIPS } from './data/mockShips';
import './App.css';

export default function App() {
  const simulatedShips = useShipSimulation(MOCK_SHIPS);

  const [selectedShipId, setSelectedShipId] = useState(null);
  const [verifiedMap, setVerifiedMap] = useState(() => {
    const map = {};
    MOCK_SHIPS.forEach((s) => {
      map[s.id] = s.verified;
    });
    return map;
  });

  const ships = useMemo(
    () =>
      simulatedShips.map((ship) => ({
        ...ship,
        verified: verifiedMap[ship.id] ?? ship.verified,
      })),
    [simulatedShips, verifiedMap]
  );

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId]
  );

  const handleSelectShip = useCallback((id) => {
    setSelectedShipId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggleVerified = useCallback((id) => {
    setVerifiedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleCloseInfo = useCallback(() => {
    setSelectedShipId(null);
  }, []);

  return (
    <AppLayout
      map={
        <VTSMap
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
        />
      }
      inboundPanel={
        <InboundPanel
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={handleSelectShip}
          onToggleVerified={handleToggleVerified}
        />
      }
      shipInfoCard={
        <ShipInfoCard ship={selectedShip} onClose={handleCloseInfo} />
      }
    />
  );
}
