import { useCallback } from 'react';

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimelineControls({
  simTime,
  duration,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onRestart,
}) {
  const handleSliderChange = useCallback(
    (e) => {
      const value = parseFloat(e.target.value);
      if (Number.isFinite(value)) onSeek(value);
    },
    [onSeek]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) onPause();
    else onPlay();
  }, [isPlaying, onPlay, onPause]);

  return (
    <div className="timeline-controls" role="group" aria-label="Scenario tijdlijn">
      <button
        type="button"
        className="timeline-btn"
        onClick={onRestart}
        title="Terug naar begin"
        aria-label="Terug naar begin"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
        </svg>
      </button>

      <button
        type="button"
        className="timeline-btn timeline-play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pauze' : 'Afspelen'}
        aria-label={isPlaying ? 'Pauze' : 'Afspelen'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <span className="timeline-time">{formatTime(simTime)}</span>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={Math.min(simTime, duration)}
        onChange={handleSliderChange}
        className="timeline-slider"
        aria-label="Scenario tijd"
        style={{
          '--timeline-progress': `${
            duration > 0 ? Math.min(100, (simTime / duration) * 100) : 0
          }%`,
        }}
      />
      <span className="timeline-time timeline-duration">{formatTime(duration)}</span>
    </div>
  );
}
