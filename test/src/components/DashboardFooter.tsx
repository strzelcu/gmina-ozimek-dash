import type { Locality } from "../lib/locality";
import FeedbackContact from "./FeedbackContact";
import SourceLink from "./SourceLink";

export default function DashboardFooter({ locality }: { locality?: Locality }) {
  const base = import.meta.env.BASE_URL;
  const airSource = locality?.air.sourceUrls[0] ?? "https://panel.syngeos.pl/";
  const positionSource = locality?.position.sourceUrl
    ?? "https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-nazw-geograficznych-prng/";

  return <footer className="dashboard-footer">
    <div><p>Przeglądarka pobiera dane pogodowe i pomiarowe po otwarciu dashboardu, co godzinę i po kliknięciu „Odśwież dane”. Ostatnie odczyty zachowuje lokalnie na tym urządzeniu. Czas wyświetlany dla Polski.</p></div>
    <div className="footer-sources">
      <SourceLink href="https://open-meteo.com/">Open-Meteo</SourceLink>
      <SourceLink href={airSource}>Czujniki powietrza</SourceLink>
      <SourceLink href="https://danepubliczne.imgw.pl/">IMGW-PIB</SourceLink>
      <SourceLink href={positionSource}>Punkt prognozy · PRNG</SourceLink>
    </div>
    <p className="attribution">Kod strony jest publicznie dostępny na portalu GitHub. <SourceLink href="https://github.com/strzelcu/gmina-ozimek-dash">Zobacz repozytorium</SourceLink></p>
    <FeedbackContact />
    <p className="attribution">Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone. Dane operacyjne mogą podlegać korektom.</p>
    <p className="attribution">Dashboardy nie korzystają z narzędzi analitycznych, nie śledzą odwiedzin i nie zapisują historii Twojej aktywności na stronie.</p>
    <p className="attribution">Strona została wygenerowana przez AI i może zawierać błędy.</p>
    <p className="footer-brand w-full text-center">
      <a href="https://strzelcu.github.io/" className="inline-flex items-center gap-3 text-lg underline underline-offset-2">
        <img src={`${base}programista-na-wsi.webp`} alt="" width={48} height={48} loading="lazy" className="shrink-0 object-contain" />
        Programista na wsi
      </a>
    </p>
  </footer>;
}
