const email = "mlody_analog3f@icloud.com";

export default function FeedbackContact() {
  return <p className="attribution">
    Propozycje zmian i błędy można zgłaszać w{" "}
    <a href="https://github.com/strzelcu/szczedrzyk/issues" className="source-link" target="_blank" rel="noreferrer">GitHub Issues</a>
    {" albo e-mailem na adres "}<a href={`mailto:${email}`} className="source-link">{email}</a>.
  </p>;
}
