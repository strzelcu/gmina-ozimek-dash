import { Building2, House } from "lucide-react";
import type { Locality } from "./lib/locality";
import Header from "./Header";
import DashboardFooter from "./components/DashboardFooter";

const localityKinds = {
  city: { icon: Building2, label: "Miasto" },
  village: { icon: House, label: "Sołectwo" },
};

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
            const { icon: Icon, label } = localityKinds[locality.kind];
            return <li key={locality.slug}>
              <a className="directory-locality" href={`${base}${locality.slug}/`}>
                <span className="directory-icon"><Icon size={23} aria-hidden="true" /></span>
                <span><strong>{locality.name}</strong><small>{label}</small></span>
              </a>
            </li>;
          })}
        </ul>
      </nav>
      <DashboardFooter />
    </main>
  </>;
}
