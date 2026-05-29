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
