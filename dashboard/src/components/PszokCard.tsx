import { Phone, Recycle } from "lucide-react";
import SourceLink from "./SourceLink";
import type { Pszok } from "../lib/waste";

export default function PszokCard({ point }: { point: Pszok }) {
  return <article className="waste-pszok" aria-labelledby="pszok-title">
    <div className="section-heading">
      <h3 id="pszok-title"><Recycle size={20} aria-hidden="true" />{point.name}</h3>
      <SourceLink href={point.sourceUrl}>Zasady i limity</SourceLink>
    </div>
    <div className="waste-pszok-grid">
      <div>
        <h4>Adres i kontakt</h4>
        <p>{point.address}</p>
        {point.entrance && <p className="waste-pszok-note">{point.entrance}</p>}
        <a className="source-link waste-pszok-phone" href={`tel:${point.phone.replaceAll(" ", "")}`}>
          <Phone size={14} aria-hidden="true" />{point.phone}
        </a>
      </div>
      <div>
        <h4>Godziny otwarcia</h4>
        <dl className="waste-pszok-hours">
          {point.hours.map(({ days, opens, closes }) => <div key={days}>
            <dt>{days}</dt>
            <dd><time dateTime={opens}>{opens}</time>–<time dateTime={closes}>{closes}</time></dd>
          </div>)}
        </dl>
        {point.closed && <p className="waste-pszok-note">{point.closed}</p>}
      </div>
    </div>
    <div className="waste-pszok-rules">
      <p>{point.requirements}</p>
      <p>Można oddać m.in. {point.accepted}.</p>
    </div>
  </article>;
}
