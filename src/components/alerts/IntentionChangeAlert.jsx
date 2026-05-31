/**
 * A single intention-change warning alert.
 * Displays a Dutch warning that a ship is no longer transmitting intentions.
 *
 * @param {Object} props
 * @param {string} props.shipName - Display name of the ship
 */
export default function IntentionChangeAlert({ shipName }) {
  return (
    <div className="intention-change-alert" role="alert" aria-live="assertive">
      <div className="intention-change-alert-title">
        <span className="intention-change-alert-dot" aria-hidden="true" />
        <h2 className="intention-change-alert-heading">WAARSCHUWING</h2>
        <span className="intention-change-alert-dot" aria-hidden="true" />
      </div>
      <p className="intention-change-alert-message">
        <strong className="intention-change-alert-ship">{shipName}</strong>
        {
          " geeft geen intenties meer door van de route. De stuurman heeft nu controle."
        }
      </p>
    </div>
  );
}
