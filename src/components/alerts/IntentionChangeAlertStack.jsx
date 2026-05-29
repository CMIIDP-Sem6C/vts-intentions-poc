import IntentionChangeAlert from "./IntentionChangeAlert";

export default function IntentionChangeAlertStack({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div className="intention-change-alert-stack">
      {alerts.map((alert) => (
        <IntentionChangeAlert key={alert.key} shipName={alert.shipName} />
      ))}
    </div>
  );
}
