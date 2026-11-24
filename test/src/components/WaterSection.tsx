import { useEffect, useState } from "react";
import { ExternalLink, Waves } from "lucide-react";
import { hydroUrl, type Result, type WaterReading } from "../../scripts/lib/sources.ts";
import { distanceKm, distanceLabel, type Gauge, type Locality } from "../lib/locality";

const day = 86400000;
const stamp = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
});
const format = (value: number | null, digits = 0) => value === null ? "—"
  : value.toLocaleString("pl-PL", { maximumFractionDigits: digits });
type History = Pick<WaterReading, "id" | "time" | "level" | "flow" | "flowTime">;

function readHistory(key: string): History[] {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored.filter(reading => reading && typeof reading.id === "string"
      && Date.parse(reading.time) > Date.now() - 3 * day
      && [reading.level, reading.flow].every(value => value === null || Number.isFinite(value))) : [];
  } catch { return []; }
}

function trend(current: WaterReading, history: History[], field: "level" | "flow") {
  const timeField = field === "level" ? "time" : "flowTime";
  const time = Date.parse(current[timeField] ?? "");
  const value = current[field];
  if (!Number.isFinite(time) || value === null || Date.now() - time > day) return null;
  const old = history.filter(row => row.id === current.id && row[field] !== null)
    .map(row => ({ value: row[field]!, offset: Math.abs(time - Date.parse(row[timeField] ?? "") - day) }))
    .filter(row => row.offset <= 3600000).sort((a, b) => a.offset - b.offset)[0];
  return old ? value - old.value : null;
}

function GaugeCard({ gauge, row, history, distance }: { gauge: Gauge; row?: WaterReading; history: History[]; distance: number }) {
  if (!row) return <article className="water-station">
    <h4>{gauge.name}</h4><p className="river-label">{distanceLabel(distance)} od miejscowości</p>
    <p className="section-message">Brak odczytu w danych IMGW.</p>
  </article>;

  const stale = Boolean(row.time && Date.now() - Date.parse(row.time) > day);
  const alarm = row.level !== null && row.alarm !== null && row.level >= row.alarm;
  const warning = row.level !== null && row.warning !== null && row.level >= row.warning;
  const hasThresholds = row.warning !== null || row.alarm !== null;
  const status = row.level === null || !row.time ? ["neutral", "Brak aktualnego odczytu"]
    : stale ? ["stale", "Stary odczyt"] : alarm ? ["danger", "Stan alarmowy"] : warning ? ["warning", "Stan ostrzegawczy"]
    : hasThresholds ? ["good", "Poniżej progów"] : ["neutral", "Brak progów IMGW"];
  const levelTrend = trend(row, history, "level"), flowTrend = trend(row, history, "flow");
  const signed = (value: number, digits = 0) => `${value > 0 ? "+" : ""}${format(value, digits)}`;

  return <article className="water-station">
    <div className="water-station-head"><h4>{row.name}</h4><span className={`pill ${status[0]}`}>{status[1]}</span></div>
    <p className="river-label">{distanceLabel(distance)} od miejscowości</p>
    <div className="water-value">{format(row.level)} <span>cm</span></div>
    <p className="water-caption">Stan wody względem zera wodowskazu</p>
    {row.time && <p className="station-time"><time dateTime={row.time}>{stamp.format(new Date(row.time))}</time></p>}
    {hasThresholds && <div className="water-thresholds">
      <span>Ostrzegawczy <strong>{row.warning === null ? "Brak progu" : `${format(row.warning)} cm`}</strong></span>
      <span>Alarmowy <strong>{row.alarm === null ? "Brak progu" : `${format(row.alarm)} cm`}</strong></span>
    </div>}
    <div className="station-detail"><span>Przepływ <strong>{format(row.flow, 2)} m³/s</strong></span>
      {row.flowTime && <time className="pollutant-time" dateTime={row.flowTime}>{stamp.format(new Date(row.flowTime))}</time>}
    </div>
    <p className="card-note">Zmiana około 24 h · {levelTrend === null ? "brak historii stanu wody" : `${signed(levelTrend)} cm`}
      {flowTrend !== null && ` · przepływ ${signed(flowTrend, 2)} m³/s`}
    </p>
    {gauge.note && <p className="card-note">{gauge.note}</p>}
  </article>;
}

export default function WaterSection({ locality, result }: { locality: Locality; result: Result<"water"> }) {
  const historyKey = `ozimek-test-river-history-v1:${locality.slug}`;
  const [history, setHistory] = useState(() => readHistory(historyKey));
  const data = result.data;
  useEffect(() => {
    if (result.error || !data?.stations.length) return;
    const fresh = data.stations.filter(reading => reading.time && Date.parse(reading.time) > Date.now() - day && Date.parse(reading.time) <= Date.now() + 60000);
    setHistory(previous => {
      const readings = new Map(previous.filter(row => Date.parse(row.time ?? "") > Date.now() - 3 * day).map(row => [`${row.id}:${row.time}`, row]));
      for (const { id, time, level, flow, flowTime } of fresh) readings.set(`${id}:${time}`, { id, time, level, flow, flowTime });
      return [...readings.values()];
    });
  }, [data, result.error]);
  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Storage can be disabled or full. */ }
  }, [history, historyKey]);

  const readings = new Map(data?.stations.map(row => [row.id, row]));
  const rivers = locality.water.rivers.filter(river => river.gauges.length > 0).sort((a, b) => a.distanceKm - b.distanceKm);
  return <section className="card water-section" aria-labelledby="water-title">
    <div className="water-heading"><div><h2 id="water-title"><Waves size={21} aria-hidden="true" />Wody w okolicy</h2>
      <p>Wodowskazy IMGW w okolicy</p></div>
      <a className="source-link" href="https://hydro.imgw.pl/" target="_blank" rel="noreferrer">Mapa IMGW<ExternalLink size={12} aria-hidden="true" /></a>
    </div>
    {result.error && <p className="error-note" role="status">Nie udało się odświeżyć danych IMGW.{data && " Widoczne są ostatnio pobrane odczyty."}</p>}
    {!rivers.length && <p className="section-message">Brak przypisanych wodowskazów IMGW.</p>}
    {rivers.map(river => <div className="watercourse" key={river.name}>
      <h3>{river.name}<span>{distanceLabel(river.distanceKm)} do osi cieku</span></h3>
      <div className="water-grid">{river.gauges.map(gauge => result.loading && !data
        ? <p className="section-meta" key={gauge.id}>Pobieranie pomiarów · {gauge.name}</p>
        : <GaugeCard key={gauge.id} gauge={gauge} row={readings.get(gauge.id)} history={history} distance={distanceKm(locality.position, gauge)} />
      )}</div>
    </div>)}
    <p className="section-meta">Trend porównuje odczyty zapisane na urządzeniu w odstępie 23–25 godzin.</p>
    <p className="section-meta"><a className="source-link" href={locality.water.sourceUrl} target="_blank" rel="noreferrer">Mapa hydrograficzna</a> · <a className="source-link" href={hydroUrl} target="_blank" rel="noreferrer">Dane IMGW</a></p>
  </section>;
}
