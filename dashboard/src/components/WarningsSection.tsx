import { ExternalLink, TriangleAlert } from "lucide-react";
import type { Result } from "../../scripts/lib/sources.ts";
import type { WarningScope } from "../lib/locality";

const date = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
});

export default function WarningsSection({ result, scope }: { result: Result<"warnings">; scope: WarningScope }) {
  const now = Date.now();
  const warnings = result.data?.warnings.filter(row => !row.until || Date.parse(row.until) > now) ?? [];
  const missing = result.data?.failed ?? [];
  const context = [scope.countyName, ...scope.catchments.map(catchment => catchment.name)].join(" · ");
  return <section className="card warnings-section" aria-labelledby="warnings-title">
    <div className="section-heading"><h2 id="warnings-title"><TriangleAlert size={20} aria-hidden="true" />Ostrzeżenia IMGW</h2>
      <a className="source-link" href="https://meteo.imgw.pl/" target="_blank" rel="noreferrer">IMGW-PIB<ExternalLink size={12} aria-hidden="true" /></a>
    </div>
    <p className="section-context">{context}</p>
    {result.loading && !result.data && <p>Sprawdzanie ostrzeżeń…</p>}
    {result.error && <p className="error-note" role="status">Nie udało się potwierdzić aktualnych ostrzeżeń. Sprawdź komunikaty IMGW.</p>}
    {!result.error && missing.length > 0 && <p className="error-note" role="status">Nie udało się sprawdzić ostrzeżeń {missing.map(kind => kind === "meteo" ? "meteorologicznych" : "hydrologicznych").join(" i ")}.</p>}
    {warnings.map(row => <details className={`warning-entry warning-level-${row.level}`} key={row.id}>
      <summary>
        <span><strong>{row.title}</strong><span className="warning-kind">{row.type === "meteo" ? "Meteorologiczne" : "Hydrologiczne"} · {Date.parse(row.from) > now ? "Nadchodzące" : "Obowiązuje"}</span></span>
        <span className={`pill ${(row.level ?? 0) >= 3 ? "danger" : "warning"}`}>{row.level && row.level > 0 ? `Stopień ${row.level}` : "Komunikat hydrologiczny"}</span>
      </summary>
      <p>{row.description}</p><p className="warning-area">{row.area}</p>
      <p className="warning-validity">Od {date.format(new Date(row.from))} · {row.until ? `do ${date.format(new Date(row.until))}` : "do odwołania"}{row.probability !== null && ` · prawdopodobieństwo ${row.probability}%`}</p>
    </details>)}
    {result.data && !result.loading && !result.error && !missing.length && !warnings.length && <p className="no-warnings">Brak aktywnych i nadchodzących ostrzeżeń IMGW dla wskazanego obszaru.</p>}
    {result.data && <p className="section-meta">Ostatnie sprawdzenie · {date.format(new Date(result.data.checkedAt))}</p>}
  </section>;
}
