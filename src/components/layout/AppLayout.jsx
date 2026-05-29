/**
 * Top-level layout shell. Positions the map, overlay panels, alerts, and bottom bar.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.map - The map component (fills the viewport)
 * @param {React.ReactNode} props.inboundPanel - Left-side inbound vessels panel
 * @param {React.ReactNode} props.shipInfoCard - Right-side ship detail card
 * @param {React.ReactNode} [props.bottomBar] - Bottom timeline/playback bar
 * @param {React.ReactNode} [props.topCenterAlerts] - Top-center alert stack
 */
export default function AppLayout({
  map,
  inboundPanel,
  shipInfoCard,
  bottomBar,
  topCenterAlerts,
}) {
  return (
    <div className="app-layout">
      <div className="map-container">{map}</div>
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
