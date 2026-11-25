import { useState } from "react";
import { ExternalLink, Wind } from "lucide-react";
import { airFreshness, airLabels, type AirReading } from "../../scripts/lib/air.ts";
import type { Result } from "../../scripts/lib/sources.ts";
import { distanceLabel, rankedSensors } from "../lib/locality";
import AirHistory from "./AirForecast";

type RankedSensor = ReturnType<typeof rankedSensors>[number];
const timestamp = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
});
const decimal = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 });

export function airStatus(reading: AirReading, failed = false) {
  const stale = failed || Boolean(reading.indexTime && Date.now() - Date.parse(reading.indexTime) > airFreshness);
  return {
    stale,
    label: stale ? "Ostatni dostępny odczyt" : reading.index === null ? "Brak aktualnej oceny" : airLabels[reading.index],
    style: stale ? "stale" : reading.index === null ? "" : `aq-${reading.index}`,
  };
}

function AirStation({ sensor, reading, failed, loading }: {
  sensor: RankedSensor;
  reading?: AirReading;
  failed: boolean;
  loading: boolean;
}) {
  const status = reading && airStatus(reading, failed);
  const localityId = `sensor-${sensor.id}`;
  const addressId = `sensor-address-${sensor.id}`;
  return <article className="air-station" aria-labelledby={`${localityId} ${addressId}`}>
    <div className="air-station-heading">
      <h3 id={localityId}>{sensor.locality}</h3>
      <span className={`pill ${sensor.local ? "good" : "neutral"}`}>
        {sensor.local ? "W miejscowości" : "Spoza miejscowości"}
      </span>
    </div>
    <p id={addressId} className="air-station-address">{sensor.address}</p>
    <p className="section-meta">{distanceLabel(sensor.distanceKm)} od punktu miejscowości</p>
    {status && reading ? <>
      <div className={`air-status ${status.style}`}><strong>{status.label}</strong></div>
      <div className="pollutants">{([["PM2,5", reading.pm25], ["PM10", reading.pm10]] as const).map(([label, value]) =>
        <div key={label}>
          <span>{label}</span>
          {value ? <><strong>{decimal.format(value.value)} <small>µg/m³</small></strong>
            <time className="pollutant-time" dateTime={value.time}>{timestamp.format(new Date(value.time))}
              {Date.now() - Date.parse(value.time) > airFreshness && " · stary odczyt"}
            </time></> : <span>Brak odczytu</span>}
        </div>
      )}</div>
    </> : <p className="section-message">{loading ? "Pobieranie pomiarów…" : "Brak dostępnych pomiarów"}</p>}
    <div className="card-foot"><a className="source-link" href={sensor.sourceUrl} target="_blank" rel="noreferrer">Syngeos<ExternalLink size={12} aria-hidden="true" /></a></div>
  </article>;
}

function AirScale({ reading }: { reading: AirReading }) {
  const range = (item: AirReading["scales"]["pm10"][number]) => item.min === null ? "—" : item.max === null
    ? `≥ ${decimal.format(item.min)}` : `${decimal.format(item.min)}–<${decimal.format(item.max)}`;
  return <details className="forecast-values">
    <summary>Skala Syngeos dla wybranego czujnika</summary>
    <div className="aq-legend">
      <div className="aq-legend-row aq-legend-heading"><span>Jakość</span><span>PM2,5 (µg/m³)</span><span>PM10 (µg/m³)</span></div>
      {reading.scales.pm25.map((item, index) => <div className="aq-legend-row" key={item.label}>
        <span><i className={`scale-${index}`} aria-hidden="true" />{item.label}</span><span>{range(item)}</span><span>{range(reading.scales.pm10[index])}</span>
      </div>)}
      <p className="aq-legend-note">Ocena odpowiada wyższej kategorii z odczytów PM2,5 i PM10.</p>
    </div>
  </details>;
}

export default function AirSection({ sensors, result, refreshToken }: {
  sensors: RankedSensor[]; result: Result<"air">; refreshToken: number;
}) {
  const [selectedId, setSelectedId] = useState(sensors[0]?.id);
  const selected = sensors.find(sensor => sensor.id === selectedId);
  const selectedReading = selected && result.data?.stations[selected.id];
  return <section id="air-measurements" className="card air-card" aria-labelledby="air-title">
    <div className="section-heading"><h2 id="air-title"><Wind size={20} aria-hidden="true" />Jakość powietrza</h2></div>
    <p className="section-context">{sensors[0]?.local === false && "Najbliższe czujniki spoza miejscowości. "}Pomiary pyłów są orientacyjne.</p>
    {!sensors.length && <p className="section-message">Brak zweryfikowanych czujników w danych dla tej miejscowości.</p>}
    {result.error && <p className="error-note" role="status">Nie udało się odświeżyć pomiarów powietrza.</p>}
    <div className="air-stations">{sensors.map(sensor => <AirStation key={sensor.id} sensor={sensor}
      reading={result.data?.stations[sensor.id]} failed={result.error || Boolean(result.data?.failed.includes(sensor.id))}
      loading={result.loading} />)}</div>
    {selected && <>
      {sensors.length > 1 && <label className="sensor-picker">Czujnik dla historii pomiarów
        <select value={selected.id} onChange={event => setSelectedId(event.target.value)}>
          {sensors.map(sensor => <option key={sensor.id} value={sensor.id}>{sensor.locality} · {sensor.address}</option>)}
        </select>
      </label>}
      <AirHistory key={selected.id} sensor={selected} refreshToken={refreshToken} />
      {selectedReading && <AirScale reading={selectedReading} />}
    </>}
  </section>;
}
