import { createContext, useContext, useMemo } from "react";
import useScenarioData from "@hooks/useScenarioData";

/** @type {React.Context<<ScenarioContextValue|null>} */
const ScenarioContext = createContext(null);

/**
 * Provider that fetches and provides scenario data.
 * Only provides data when a sector is selected.
 *
 * @param {{ scenarioId: number|null, sector: string|null, children: React.ReactNode }} props
 */
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
      crossings: activeData.crossings.map((c) => ({ ...c })),
    };
  }, [activeData]);

  /** @type {ScenarioContextValue} */
  const value = useMemo(
    () => ({
      scenarioId,
      scenario: activeData?.scenario ?? null,
      // Originals
      originalShips: originals?.ships ?? [],
      originalIntentions: originals?.intentions ?? [],
      originalEvents: originals?.events ?? [],
      originalCrossings: originals?.crossings ?? [],
      // Live references
      ships: activeData?.ships ?? [],
      intentions: activeData?.intentions ?? [],
      events: activeData?.events ?? [],
      crossings: activeData?.crossings ?? [],
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

/**
 * Access the scenario context.
 * @returns {ScenarioContextValue}
 * @throws {Error} If used outside ScenarioProvider
 */
export function useScenario() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
