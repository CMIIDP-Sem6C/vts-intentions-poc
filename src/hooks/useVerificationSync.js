import { useCallback, useEffect, useMemo, useState } from "react";

const POLL_MS = 1000;

/**
 * Normalize a ship ID to a lowercase trimmed string for matching.
 * @param {string|number|null} shipId
 * @returns {string}
 */
function normalizeShipId(shipId) {
  return String(shipId ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Fetch JSON from a URL, throwing on non-OK responses.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Hook that polls `/api/verifications` and provides a ship-id-indexed lookup map
 * plus an `updateVerification` function for PATCH requests.
 *
 * @returns {{
 *   verificationByShipId: Record<string, Verification>,
 *   updateVerification: (shipId: string|number, updates: { verified?: boolean, destination?: string }) => Promise<<Verification>,
 *   verificationError: string|null
 * }}
 */
export default function useVerificationSync() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      const data = await requestJson("/api/verifications");
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
      const rawShipId = row.ship_id;
      const normalizedShipId = normalizeShipId(rawShipId);
      if (rawShipId != null) {
        map[rawShipId] = row;
      }
      if (normalizedShipId) {
        map[normalizedShipId] = row;
      }
    });
    return map;
  }, [rows]);

  /**
   * PATCH a verification row for a given ship.
   * @param {string|number} shipId
   * @param {{ verified?: boolean, destination?: string }} updates
   * @returns {Promise<<Verification>}
   */
  const updateVerification = useCallback(async (shipId, updates) => {
    const saved = await requestJson(
      `/api/verifications/${encodeURIComponent(shipId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      },
    );

    setRows((prev) => {
      const normalizedRequestedId = normalizeShipId(shipId);
      const index = prev.findIndex(
        (row) => normalizeShipId(row.ship_id) === normalizedRequestedId,
      );
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
