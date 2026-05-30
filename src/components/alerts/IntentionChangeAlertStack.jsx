import IntentionChangeAlert from "./IntentionChangeAlert";

/**
 * Stack of active intention-change alerts.
 *
 * @param {Object} props
 * @param {IntentionChangeAlert[]} [props.alerts] - Active alerts to display
 */
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
