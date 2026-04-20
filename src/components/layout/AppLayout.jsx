export default function AppLayout({ map, inboundPanel, shipInfoCard }) {
  return (
    <div className="app-layout">
      <div className="map-container">{map}</div>
      <div className="overlay-panels">
        <div className="left-panels">{inboundPanel}</div>
        <div className="right-panels">{shipInfoCard}</div>
      </div>
    </div>
  );
}
