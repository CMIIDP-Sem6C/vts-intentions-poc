import { useEffect, useState } from 'react';

const PLACEHOLDER_SCENARIOS = [
  { id: -2, name: 'Scenario 2', description: 'Nog niet beschikbaar' },
  { id: -3, name: 'Scenario 3', description: 'Nog niet beschikbaar' },
  { id: -4, name: 'Scenario 4', description: 'Nog niet beschikbaar' },
];

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

  const availableIds = new Set(scenarios.map((s) => s.id));
  const placeholders = PLACEHOLDER_SCENARIOS.filter((p) => !availableIds.has(p.id));
  const rows = [...scenarios, ...placeholders].slice(0, 4);

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
          {rows.map((sc) => {
            const isAvailable = sc.id > 0;
            return (
              <button
                key={sc.id}
                className={`scenario-select-row ${isAvailable ? '' : 'disabled'}`}
                onClick={() => isAvailable && onSelect(sc.id)}
                disabled={!isAvailable}
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
                  {isAvailable ? (
                    <>
                      {sc.time != null && <span>{sc.time}s</span>}
                      <span className="scenario-row-arrow">{'->'}</span>
                    </>
                  ) : (
                    <span className="scenario-row-locked">VERGRENDELD</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
