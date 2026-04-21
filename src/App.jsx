import { useEffect, useState, useCallback, useMemo } from "react";
import AppLayout from "./components/layout/AppLayout";
import VTSMap from "./components/map/VTSMap";
import InboundPanel from "./components/panels/InboundPanel";
import ShipInfoCard from "./components/panels/ShipInfoCard";
import useShipSimulation from "./hooks/useShipSimulation";
import { MOCK_SHIPS, MOORED_SHIPS } from "./data/mockShips";
import { API_URL, ENDPOINT_DESTINATIONS } from "./utils/api";
import "./App.css";

export default function App() {
  const simulatedShips = useShipSimulation(MOCK_SHIPS);

  const [selectedShipId, setSelectedShipId] = useState(null);

  const [destinationMap, setDestinationMap] = useState({});
  const [aisActiveMap, setAisActiveMap] = useState(() => {
    const m = {};
    MOCK_SHIPS.forEach((s) => {
      m[s.id] = s.aisActive;
    });
    return m;
  });

  const [mooredShips, setMooredShips] = useState(() =>
    MOORED_SHIPS.map((ms) => ({ ...ms })),
  );
  const [selectedMooredId, setSelectedMooredId] = useState(null);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/${ENDPOINT_DESTINATIONS}`)
      .then((res) => res.json())
      .then((data) => setDestinations(data))
      .catch((err) => console.error("Failed to load destinations:", err));
  }, []);

  const ships = useMemo(
    () =>
      simulatedShips.map((ship) => ({
        ...ship,
        destination: destinationMap[ship.id] || ship.destination,
        aisActive: aisActiveMap[ship.id] ?? ship.aisActive,
      })),
    [simulatedShips, destinationMap, aisActiveMap],
  );

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId],
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
      prev.map((ms) => (ms.id === id ? { ...ms, ...updates } : ms)),
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
        />
      }
      shipInfoCard={
        <ShipInfoCard
          ship={selectedShip}
          onClose={handleCloseInfo}
          onSetDestination={handleSetDestination}
          onScanAIS={handleScanAIS}
          destinations={destinations}
        />
      }
    />
  );
}
