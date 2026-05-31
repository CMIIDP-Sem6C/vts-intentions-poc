/**
 * Top-level layout shell. Positions the map, overlay panels, alerts, and bottom bar.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.map - The map component (fills the viewport)
 * @param {React.ReactNode} props.inboundPanel - Left-side inbound vessels panel
 * @param {React.ReactNode} props.shipInfoCard - Right-side ship detail card
 * @param {React.ReactNode} [props.bottomBar] - Bottom timeline/playback bar
 * @param {React.ReactNode} [props.topCenterAlerts] - Top-center alert stack
 * @param {() => void} [props.onBack] - Return to the start (scenario select) screen
 */
export default function AppLayout({
  map,
  inboundPanel,
  shipInfoCard,
  bottomBar,
  topCenterAlerts,
  onBack,
}) {
  return (
    <div className="app-layout">
      <div className="map-container">{map}</div>
      {onBack ? (
        <button
          type="button"
          className="back-to-start-btn"
          onClick={onBack}
          title="Terug naar menu"
          aria-label="Terug naar menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Menu
        </button>
      ) : null}
      <div className="overlay-panels">
        {topCenterAlerts ? (
          <div className="top-center-alerts">{topCenterAlerts}</div>
        ) : null}
        <div className="left-panels">{inboundPanel}</div>
        <div className="right-panels">{shipInfoCard}</div>
      </div>
      {bottomBar ? <div className="bottom-bar">{bottomBar}</div> : null}
    </div>
  );
}
