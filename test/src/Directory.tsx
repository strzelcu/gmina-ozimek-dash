import { Building2, MapPin } from "lucide-react";
import type { Locality } from "./lib/locality";
import Header from "./Header";

export default function Directory({ localities }: { localities: Locality[] }) {
  const sorted = [...localities].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  const base = import.meta.env.BASE_URL;
  return <>
    <Header />
    <main className="locality-directory">
      <div className="directory-heading">
        <h1>Dashboardy miejscowości</h1>
        <p>Sprawdź pogodę, pomiary powietrza, stany wód i terminy odbioru odpadów dla swojej miejscowości.</p>
      </div>
      <nav aria-label="Miejscowości gminy Ozimek">
        <ul className="directory-grid">
          {sorted.filter(locality => locality.kind === "city").concat(sorted.filter(locality => locality.kind === "village")).map(locality => {
            const Icon = locality.kind === "city" ? Building2 : MapPin;
            return <li key={locality.slug}>
              <a className="directory-locality" href={`${base}${locality.slug}/`}>
                <span className="directory-icon"><Icon size={23} aria-hidden="true" /></span>
                <span><strong>{locality.name}</strong><small>{locality.kind === "city" ? "Miasto" : "Sołectwo"}</small></span>
              </a>
            </li>;
          })}
        </ul>
      </nav>
      <footer className="directory-footer">
        <a href={base.replace(/test\/$/, "")}>Dashboard Szczedrzyka · wersja główna</a>
        <p>Strona została wygenerowana przez AI i może zawierać błędy.</p>
      </footer>
    </main>
  </>;
}
