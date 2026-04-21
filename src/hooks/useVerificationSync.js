import { useCallback, useEffect, useMemo, useState } from 'react';

const POLL_MS = 1000;

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export default function useVerificationSync() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      const data = await requestJson('/api/verifications');
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const interval = setInterval(fetchRows, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRows]);

  const byShipId = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      map[row.ship_id] = row;
    });
    return map;
  }, [rows]);

  const updateVerification = useCallback(async (shipId, updates) => {
    const saved = await requestJson(`/api/verifications/${encodeURIComponent(shipId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    setRows((prev) => {
      const index = prev.findIndex((row) => row.ship_id === shipId);
      if (index === -1) return [...prev, saved];
      const next = [...prev];
      next[index] = saved;
      return next;
    });
    return saved;
  }, []);

  return {
    verificationByShipId: byShipId,
    updateVerification,
    verificationError: error,
  };
}
