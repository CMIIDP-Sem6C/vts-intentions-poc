import { createContext, useContext, useMemo } from "react";
import useScenarioData from "@hooks/useScenarioData";

const ScenarioContext = createContext(null);

export function ScenarioProvider({ scenarioId, sector, children }) {
  const { data, loading, error } = useScenarioData(scenarioId);

  // Only provide data when sector is selected
  const activeData = sector ? data : null;

  // Immutable originals
  const originals = useMemo(() => {
    if (!activeData) return null;
    return {
      scenario: activeData.scenario,
      ships: activeData.ships.map((s) => ({ ...s })),
      intentions: activeData.intentions.map((i) => ({ ...i })),
      events: activeData.events.map((e) => ({ ...e })),
    };
  }, [activeData]);

  const value = useMemo(
    () => ({
      scenarioId,
      scenario: activeData?.scenario ?? null,
      // Originals
      originalShips: originals?.ships ?? [],
      originalIntentions: originals?.intentions ?? [],
      originalEvents: originals?.events ?? [],
      // Live references
      ships: activeData?.ships ?? [],
      intentions: activeData?.intentions ?? [],
      events: activeData?.events ?? [],
      loading,
      error,
    }),
    [scenarioId, activeData, originals, loading, error],
  );

  return (
    <ScenarioContext.Provider value={value}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
