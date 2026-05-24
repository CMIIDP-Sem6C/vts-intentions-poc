export default function IntentionChangeAlert({ shipName }) {
  return (
    <div className="intention-change-alert" role="alert" aria-live="assertive">
      <span className="intention-change-alert__indicator" aria-hidden="true" />
      <div className="intention-change-alert__content">
        <p className="intention-change-alert__title">WAARSCHUWING</p>
        <p className="intention-change-alert__message">
          <strong className="intention-change-alert__ship">{shipName}</strong>
          {" geeft geen intenties meer door van de route. De stuurman heeft nu controle."}
        </p>
      </div>
    </div>
  );
}
