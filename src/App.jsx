import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import AppLayout from "./components/layout/AppLayout";
import VTSMap from "./components/map/VTSMap";
import InboundPanel from "./components/panels/InboundPanel";
import ShipInfoCard from "./components/panels/ShipInfoCard";
import useVerificationSync from './hooks/useVerificationSync';
import useScenarioBundle from './hooks/useScenarioBundle';
import useScenarioEventEngine from './hooks/useScenarioEventEngine';
import useScenarioShipSimulation from './hooks/useScenarioShipSimulation';
import { MOORED_SHIPS } from "./data/mockShips";
import { API_URL, ENDPOINT_DESTINATIONS } from "./utils/api";
import { resolveSectorKeyFromDbId } from "./utils/resolveSectorKey";
import "./App.css";

function readScenarioId() {
  if (typeof window === 'undefined') return 1;
  const raw = new URLSearchParams(window.location.search).get('scenario');
  const n = parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function App() {
  const scenarioId = useMemo(() => readScenarioId(), []);
  const { bundle, loading, error, reload, dataVersion } = useScenarioBundle(scenarioId);

  const {
    verificationByShipId,
    updateVerification,
    verificationError,
  } = useVerificationSync();

  const activeSector = useMemo(() => {
    if (!bundle?.scenario) return 'waalhaven';
    return resolveSectorKeyFromDbId(bundle.scenario.sector_id);
  }, [bundle]);

  const scenarioCenter = bundle?.scenario?.start_coordinate ?? null;
  const scenarioZoom = 14;

  const shipTemplatesById = useMemo(() => {
    if (!bundle?.ships) return {};
    const m = {};
    for (const s of bundle.ships) {
      m[String(s.id)] = { ...s, id: String(s.id) };
    }
    return m;
  }, [bundle]);

  const [selectedShipId, setSelectedShipId] = useState(null);
  const [spawnedShipIds, setSpawnedShipIds] = useState([]);
  const [intentionVisibleByShip, setIntentionVisibleByShip] = useState({});
  const bundleRef = useRef(null);
  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  useEffect(() => {
    setSpawnedShipIds([]);
    setIntentionVisibleByShip({});
    setSelectedShipId(null);
  }, [dataVersion]);

  const onSpawnShip = useCallback((shipId) => {
    setSpawnedShipIds((p) => (p.includes(shipId) ? p : [...p, shipId]));
    const b = bundleRef.current;
    const hasIntentions = (b?.intentions_by_ship_id?.[shipId]?.length ?? 0) > 0;
    setIntentionVisibleByShip((prev) => ({ ...prev, [shipId]: hasIntentions }));
  }, []);

  const onHideIntention = useCallback((shipId) => {
    setIntentionVisibleByShip((prev) => ({ ...prev, [shipId]: false }));
  }, []);

  const onShowIntention = useCallback((shipId) => {
    setIntentionVisibleByShip((prev) => ({ ...prev, [shipId]: true }));
  }, []);

  useScenarioEventEngine({
    events: bundle?.events ?? [],
    resetKey: bundle ? `${bundle.scenario.id}:${dataVersion}` : `0:${dataVersion}`,
    onSpawnShip,
    onHideIntention,
    onShowIntention,
  });

  const simulatedShips = useScenarioShipSimulation(shipTemplatesById, spawnedShipIds);

  const [aisActiveMap, setAisActiveMap] = useState({});

  useEffect(() => {
    if (!bundle?.ships) return;
    setAisActiveMap((prev) => {
      const next = { ...prev };
      for (const s of bundle.ships) {
        const id = String(s.id);
        if (next[id] === undefined) next[id] = s.aisActive;
      }
      return next;
    });
  }, [bundle]);

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
        destination: verificationByShipId[ship.id]?.destination ?? ship.destination,
        verified: verificationByShipId[ship.id]?.verified ?? false,
        aisActive: aisActiveMap[ship.id] ?? ship.aisActive,
      })),
    [simulatedShips, verificationByShipId, aisActiveMap],
  );

  const intentionLayers = useMemo(() => {
    if (!bundle?.intentions_by_ship_id) return [];
    const out = [];
    for (const [shipId, intents] of Object.entries(bundle.intentions_by_ship_id)) {
      const vis = intentionVisibleByShip[shipId] ?? false;
      for (const it of intents) {
        if (it.route?.length >= 2) {
          out.push({
            key: `${shipId}-${it.id}`,
            shipId,
            positions: it.route,
            visible: vis,
            name: it.name,
          });
        }
      }
    }
    return out;
  }, [bundle, intentionVisibleByShip]);

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

  const handleSetDestination = useCallback(async (id, dest) => {
    try {
      await updateVerification(id, { destination: dest, verified: true });
    } catch (_error) {
      // Polling loop will retry.
    }
  }, [updateVerification]);

  const handleVerifyShip = useCallback(async (id) => {
    try {
      await updateVerification(id, { verified: true });
    } catch (_error) {
      // Polling loop will retry.
    }
  }, [updateVerification]);

  const handleToggleShipVerification = useCallback(async (id, verified) => {
    try {
      await updateVerification(id, { verified });
    } catch (_error) {
      // Polling loop will retry.
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

  const handleSelectMoored = useCallback((id) => {
    setSelectedMooredId((prev) => (prev === id ? null : id));
    setSelectedShipId(null);
  }, []);

  const handleUpdateMoored = useCallback((id, updates) => {
    setMooredShips((prev) =>
      prev.map((ms) => (ms.id === id ? { ...ms, ...updates } : ms)),
    );
  }, []);

  if (loading) {
    return (
      <div className="scenario-gate">
        <p className="scenario-gate-title">Scenario laden…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-gate">
        <p className="scenario-gate-title">Scenario kon niet worden geladen</p>
        <p className="scenario-gate-detail">{error}</p>
        <button type="button" className="scenario-gate-btn" onClick={() => reload()}>
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (!bundle) {
    return null;
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
          scenarioMapCenter={scenarioCenter}
          scenarioMapZoom={scenarioZoom}
          intentionLayers={intentionLayers}
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
