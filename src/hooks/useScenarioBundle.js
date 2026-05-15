import { useEffect, useState, useCallback } from 'react';

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export default function useScenarioBundle(scenarioId) {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson(`/api/scenarios/${encodeURIComponent(scenarioId)}`);
      setBundle(data);
      setDataVersion((v) => v + 1);
    } catch (e) {
      setError(e.message || String(e));
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    load();
  }, [load]);

  return { bundle, loading, error, reload: load, dataVersion };
}
