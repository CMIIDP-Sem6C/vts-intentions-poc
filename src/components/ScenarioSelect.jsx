import { useEffect, useState } from 'react';

export default function ScenarioSelect({ onSelect }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/scenarios')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setScenarios(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="sector-select-overlay">
      <div className="sector-select-card scenario-select-card">
        <h1 className="sector-select-title">VTS ROTTERDAM</h1>
        <p className="sector-select-subtitle">Selecteer een scenario</p>

        {loading && <p className="scenario-status">Scenarios laden...</p>}
        {error && (
          <p className="scenario-status scenario-status-error">
            Kon scenarios niet laden: {error}
          </p>
        )}

        <div className="scenario-select-rows">
          {scenarios.map((sc) => {
            const duration = sc.time ?? sc.duration_seconds;
            return (
              <button
                key={sc.id}
                className="scenario-select-row"
                onClick={() => onSelect(sc.id)}
              >
                <div className="scenario-row-main">
                  <span className="scenario-row-name">
                    {sc.name || `Scenario ${sc.id}`}
                  </span>
                  {sc.description && (
                    <span className="scenario-row-desc">{sc.description}</span>
                  )}
                </div>
                <div className="scenario-row-meta">
                  {duration != null && <span>{duration}s</span>}
                  <span className="scenario-row-arrow">{'->'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
