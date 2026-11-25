import { useEffect, useState, useCallback, useMemo, useRef, type SetStateAction } from "react";
import { CloudSun, Wind, MapPin, RefreshCw, Droplets, Thermometer, Gauge, Sun, Cloud, CloudRain, Moon, Sunrise, Sunset, ExternalLink, Trash2, ArrowDownRight, ArrowUp, Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cachedData, refreshData } from "./lib/browser-data";
import AirSection, { airStatus } from "./components/AirSection";
import Header from "./Header";
import WarningsSection from "./components/WarningsSection";
import WaterSection from "./components/WaterSection";
import EnvironmentExtras, { pollenPlants, usePollenForecast } from "./components/EnvironmentExtras";
import FeedbackContact from "./components/FeedbackContact";
import WasteSection, { formatWasteDate, useWasteDay } from "./components/WasteSection";
import { fractions, relativeDay, wasteScheduleWeeks } from "./lib/waste";
import { distanceLabel, rankedSensors, type Locality } from "./lib/locality";
import { formatTemperature } from "./lib/temperature";
import type { DataSource, Result } from "../scripts/lib/sources.ts";

const empty = { data: null, loading: true, error: false };
const number = (v: any, decimals = 0) => v === null || v === undefined || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("pl-PL", { maximumFractionDigits: decimals });
function localDate(value: string) { return value ? new Intl.DateTimeFormat("pl-PL", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Warsaw" }).format(new Date(value)) : "Brak czasu pomiaru"; }
function condition(code: number) { if(code===0)return "Bezchmurnie";if(code<=2)return "Częściowe zachmurzenie";if(code===3)return "Pochmurno";if(code<=48)return "Mgła";if(code<=57)return "Mżawka";if(code<=67)return "Deszcz";if(code<=77)return "Śnieg";if(code<=82)return "Przelotny deszcz";if(code<=86)return "Przelotny śnieg";return "Burza"; }
function WeatherIcon({code,night=false,className=""}:{code:number;night?:boolean;className?:string}) { const Icon=code===0?(night?Moon:Sun):code<=2?CloudSun:code<=48?Cloud:CloudRain;return <Icon className={className} aria-hidden="true"/>; }
function Source({children,href}:{children:React.ReactNode;href:string}) { return <a className="source-link" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={12} aria-hidden="true"/></a>; }
export default function Dashboard({ locality }: { locality: Locality }) {
 const [weather, setWeather] = useState<Result<"weather">>(empty);
 const [air, setAir] = useState<Result<"air">>(empty);
 const [water, setWater] = useState<Result<"water">>(empty);
 const [alerts, setAlerts] = useState<Result<"warnings">>(empty);
 const refreshing=useRef(false);
 const [checked, setChecked] = useState<string | null>(null);
 const [refreshToken, setRefreshToken] = useState(0);
 const today = useWasteDay();
 const pollenForecast = usePollenForecast(locality, refreshToken);
 const sensors = useMemo(() => rankedSensors(locality), [locality]);
 const pollenValues = pollenForecast.pollen?.values ?? [];
 const positivePollen = pollenPlants
  .flatMap(([, plant], i) => {
   const value = pollenValues[i];
   return typeof value === "number" && value > 0 ? [{ plant, value }] : [];
  })
  .sort((a, b) => b.value - a.value);
 const summaryRef = useRef<HTMLElement>(null);
 const [showBackToTop, setShowBackToTop] = useState(false);
 useEffect(() => {
  const summary = summaryRef.current;
  if (!summary) return;
  const update = () => setShowBackToTop(summary.getBoundingClientRect().bottom <= 0);
  const observer = new IntersectionObserver(update);
  observer.observe(summary);
  window.addEventListener("scroll", update, { passive: true });
  return () => {
   observer.disconnect();
   window.removeEventListener("scroll", update);
  };
 }, []);
 const refresh = useCallback(async (initial = false) => {
  if (refreshing.current) return;
  refreshing.current = true;
  if (!initial) setRefreshToken(token => token + 1);
  async function update<T extends DataSource>(type: T, set: (value: SetStateAction<Result<T>>) => void) {
   const cached = cachedData(locality, type);
   set(old => ({ ...old, data: old.data ?? cached, loading: true }));
   set(await refreshData(locality, type));
  }
  try {
   await Promise.all([update("weather", setWeather), update("air", setAir), update("water", setWater), update("warnings", setAlerts)]);
   setChecked(new Date().toISOString());
  } finally { refreshing.current = false; }
 }, [locality]);
 useEffect(() => {
  void refresh(true);
  const update = () => { void refresh(); };
  const timer = window.setInterval(update, 3600000);
  const resume = () => { if (document.visibilityState === "visible") update(); };
  window.addEventListener("online", update);
  document.addEventListener("visibilitychange", resume);
  return () => { window.clearInterval(timer); window.removeEventListener("online", update); document.removeEventListener("visibilitychange", resume); };
 }, [refresh]);

 const loading=weather.loading||air.loading||water.loading||alerts.loading,w=weather.data;
 const weatherOld=Boolean(w&&(w.stale||Date.now()-Date.parse(w.fetchedAt)>3600000||Date.now()-Date.parse(w.current.time)>10800000));
 const forecastToday = today;
 const sunIndex=w?.daily.time.indexOf(forecastToday)??-1;
 const clock=(time:string)=>new Intl.DateTimeFormat("pl-PL",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(time));
 const hours=w?.hourly?.time.map((time:string,i:number)=>({time,i})).filter(({time}:any)=>Date.parse(time)>=Math.floor(Date.now()/3600000)*3600000).slice(0,24)??[];
 const airFailed = (id: string) => air.error || Boolean(air.data?.failed.includes(id));
 const primarySensor = sensors.find(sensor => {
  const reading = air.data?.stations[sensor.id];
  return reading && !airStatus(reading, airFailed(sensor.id)).stale;
 }) ?? sensors.find(sensor => air.data?.stations[sensor.id]);
 const a = primarySensor && air.data?.stations[primarySensor.id];
 const airSummary = primarySensor && a && airStatus(a, airFailed(primarySensor.id));
 const wasteWeeks = wasteScheduleWeeks(locality.waste.schedules, today);
 const separateWasteAreas = new Set(locality.waste.schedules.map(schedule => schedule.coverage)).size > 1;
 const longDay = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw",
 }).format(new Date(`${today}T12:00:00Z`));
 return <><Header /><main>
 <div className="page-heading locality-heading">
  <div><p className="date-line">{longDay}</p><h1>{locality.name}</h1>
   <p className="location"><MapPin size={15} aria-hidden="true" />{locality.municipality} · {locality.region}</p>
  </div>
  <div className="refresh-area"><Button className="refresh-button" variant="outline" onClick={() => { void refresh(); }} disabled={loading}>
   <RefreshCw size={16} className={loading ? "spin" : ""} aria-hidden="true" />{loading ? "Pobieranie…" : "Odśwież dane"}
  </Button><span className="checked" aria-live="polite">{checked ? `Sprawdzono o ${clock(checked)}` : "Łączenie ze źródłami danych"}</span></div>
 </div>
 <section ref={summaryRef} className="card daily-summary" aria-labelledby="daily-summary-title">
  <h2 id="daily-summary-title">Na dziś</h2>
  <div className="daily-summary-grid">
   <a className="daily-summary-item" href="#air-measurements">
    <span className="daily-summary-label"><Wind size={17} aria-hidden="true"/>Pyły w powietrzu<ArrowDownRight size={15} aria-hidden="true"/></span>
    {a && airSummary && primarySensor ? <>
     <strong className={`daily-summary-air ${airSummary.style}`}>{airSummary.label}</strong>
     <small>{primarySensor.locality} · {primarySensor.address}{!primarySensor.local && ` · ${distanceLabel(primarySensor.distanceKm)}`}</small>
     <small>PM2,5 · {number(a.pm25?.value, 1)} µg/m³</small>
     <small>PM10 · {number(a.pm10?.value, 1)} µg/m³</small>
    </> : <strong>{air.loading ? "Wczytywanie…" : "Brak pomiarów"}</strong>}
   </a>
   <a className="daily-summary-item" href="#weather-details">
    <span className="daily-summary-label"><CloudSun size={17} aria-hidden="true"/>Pogoda<ArrowDownRight size={15} aria-hidden="true"/></span>
    {w ? <>
     <span className="daily-summary-temperature"><strong>{formatTemperature(w.current.temperature_2m)}°C</strong><WeatherIcon code={w.current.weather_code} night={!w.current.is_day}/></span>
     <span>{condition(w.current.weather_code)}</span>
     <small>Odczuwalna {formatTemperature(w.current.apparent_temperature)}°C{weatherOld ? " · starsze dane" : ""}</small>
    </> : <strong>{weather.loading ? "Wczytywanie…" : "Brak danych"}</strong>}
   </a>
   <a className="daily-summary-item" href="#pollen-title">
    <span className="daily-summary-label"><Flower2 size={17} aria-hidden="true"/>Pylenie roślin<ArrowDownRight size={15} aria-hidden="true"/></span>
    {positivePollen.length ? <>
     <strong>{positivePollen.slice(0, 2).map(({ plant, value }) =>
      `${plant} ${value < 0.1 ? "<0,1" : number(value, 1)}`
     ).join(" · ")}</strong>
     <small>ziaren/m³{positivePollen.length > 2 ? ` · +${positivePollen.length - 2} inne` : ""}</small>
    </> : <strong>{pollenValues.length === pollenPlants.length && pollenValues.every(value => value === 0)
     ? "Prognoza: 0 ziaren/m³"
     : pollenValues.includes(0) ? "0 w dostępnych danych"
     : pollenForecast.loading ? "Wczytywanie…" : "Brak danych"}</strong>}
    {pollenForecast.error && pollenValues.some(value => value !== null) ? <small>Wcześniejsza prognoza</small> : null}
   </a>
   <a className="daily-summary-item" href="#waste-details">
    <span className="daily-summary-label"><Trash2 size={17} aria-hidden="true"/>Wywóz odpadów<ArrowDownRight size={15} aria-hidden="true"/></span>
    {!wasteWeeks.length && <strong>Brak aktualnego harmonogramu</strong>}
    {wasteWeeks.map(({ schedule, collections }) => <div className="summary-waste" key={`${schedule.region}:${schedule.coverage}:${schedule.validFrom}`}>
      {separateWasteAreas && <small>{schedule.coverage}</small>}
      {collections.length ? <ul>{collections.map(entry => <li key={entry.date}>
        <strong>{relativeDay(entry.date, today)}</strong>
        <time dateTime={entry.date}>{formatWasteDate(entry.date)}</time>
        <small>{entry.fractions.map(fraction => fractions[fraction]).join(" · ")}</small>
      </li>)}</ul> : <strong>Brak odbioru w ciągu 7 dni</strong>}
    </div>)}
   </a>
  </div>
 </section>
 <WarningsSection result={alerts} scope={locality.warnings} />
 <AirSection sensors={sensors} result={air} refreshToken={refreshToken} />

 <section className="weather-group" aria-labelledby="weather-group-title"><h2 className="topic-title" id="weather-group-title">Pogoda i prognozy</h2><div className="dashboard-grid"><div className="current-weather-column"><section id="weather-details" className="card weather-card" aria-labelledby="weather-title"><div className="card-head"><h3 className="card-title" id="weather-title"><CloudSun size={20}/>Aktualne warunki</h3><span className="pill weather-pill">{locality.name}</span></div>
 {w?<><div className="weather-main"><div><div className="big-temperature">{formatTemperature(w.current.temperature_2m)}<span>°C</span></div><p className="condition">{condition(w.current.weather_code)}</p><p className="feels-like">Odczuwalna {formatTemperature(w.current.apparent_temperature)}°C</p></div><WeatherIcon code={w.current.weather_code} night={!w.current.is_day} className="main-weather-icon"/></div><div className="weather-details"><div className="weather-metrics"><div><Wind size={18}/><span>Wiatr</span><strong>{number(w.current.wind_speed_10m)} <small>km/h</small></strong></div><div><Droplets size={18}/><span>Wilgotność</span><strong>{number(w.current.relative_humidity_2m)} <small>%</small></strong></div><div><Gauge size={18}/><span>Ciśnienie</span><strong>{number(w.current.pressure_msl)} <small>hPa</small></strong></div></div><div className="weather-metrics"><div><Wind size={18}/><span>Porywy</span><strong>{number(w.current.wind_gusts_10m)} <small>km/h</small></strong></div><div><Wind size={18}/><span>Kierunek wiatru</span><strong>{typeof w.current.wind_direction_10m==="number"&&Number.isFinite(w.current.wind_direction_10m)?<svg width="30" height="30" viewBox="0 0 32 32" role="img" aria-label={`Wiatr z kierunku ${number(w.current.wind_direction_10m)} stopni`} style={{margin:0,color:"inherit"}}><title>{`Kierunek, z którego wieje wiatr: ${number(w.current.wind_direction_10m)}°`}</title><g transform={`rotate(${w.current.wind_direction_10m} 16 16)`}><path d="M16 4 L24 18 L18 16 L18 28 L14 28 L14 16 L8 18 Z" fill="currentColor"/></g></svg>:"—"}</strong></div><div><Cloud size={18}/><span>Widzialność</span><strong>{number(typeof w.current.visibility==="number"?w.current.visibility/1000:null,1)} <small>km</small></strong></div></div></div>{sunIndex>=0&&<div className="sun-times"><div><Sunrise size={19}/><span>Wschód słońca<strong>{clock(w.daily.sunrise[sunIndex])}</strong></span></div><div><Sunset size={19}/><span>Zachód słońca<strong>{clock(w.daily.sunset[sunIndex])}</strong></span></div></div>}<div className="weather-foot"><span>Model pogodowy · {localDate(w.current.time)}{weatherOld?" · starsze dane":""}</span><Source href="https://open-meteo.com/">Open-Meteo</Source></div></>:<div className="loading-block">{weather.loading?<><Skeleton className="weather-skeleton"/><span>Wczytywanie pogody…</span></>:<p>Brak dostępnych danych pogodowych</p>}</div>}{weatherOld||weather.error?<p className="error-note" role="status">{w?"Widoczna jest ostatnia dostępna pogoda. ":"Pogoda chwilowo niedostępna. "}Automatycznie sprawdzam dostępność nowej aktualizacji.</p>:null}</section>
 <section className="card hourly-section" aria-labelledby="hourly-title"><div className="section-heading"><h3 className="card-title" id="hourly-title"><CloudSun size={21}/>Prognoza godzinowa</h3><span className="pill neutral">NAJBLIŻSZE 24 GODZINY</span></div>{w&&hours.length?<><div className="hourly-scroll" tabIndex={0} role="region" aria-label="Prognoza godzinowa — przewiń w poziomie"><table className="hourly-table"><thead><tr><th scope="col">Godzina</th>{hours.map(({time,i}:any)=><th scope="col" key={time}>{clock(time)}<span>{new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",timeZone:"Europe/Warsaw"}).format(new Date(time))}</span></th>)}</tr></thead><tbody><tr><th scope="row">Pogoda</th>{hours.map(({time,i}:any)=><td key={time} title={condition(w.hourly.weather_code[i])}><span className="sr-only">{condition(w.hourly.weather_code[i])}</span><WeatherIcon code={w.hourly.weather_code[i]} night={!w.hourly.is_day[i]}/></td>)}</tr><tr><th scope="row">Temperatura</th>{hours.map(({time,i}:any)=><td className="hourly-temperature" key={time}>{formatTemperature(w.hourly.temperature_2m[i])}°C</td>)}</tr><tr><th scope="row">Szansa opadu</th>{hours.map(({time,i}:any)=><td key={time}>{number(w.hourly.precipitation_probability[i])}%</td>)}</tr><tr><th scope="row">Opad</th>{hours.map(({time,i}:any)=><td key={time}>{number(w.hourly.precipitation[i],1)} mm</td>)}</tr><tr><th scope="row">Wiatr</th>{hours.map(({time,i}:any)=><td key={time}>{number(w.hourly.wind_speed_10m[i])} km/h</td>)}</tr></tbody></table></div><p className="section-meta">Przewiń, aby zobaczyć kolejne godziny. Czas polski.{weatherOld?" Widoczne są starsze dane prognozy.":""}</p></>:<div className="hourly-empty">{weather.loading?"Wczytywanie prognozy godzinowej…":"Prognoza godzinowa chwilowo niedostępna."}</div>}</section></div>
 <section className="card forecast-card" aria-labelledby="forecast-title"><div className="card-head"><h3 className="card-title" id="forecast-title"><Thermometer size={20}/>Prognoza na 5 dni</h3><span className="pill neutral">{weatherOld?"STARSZE DANE":"PROGNOZA"}</span></div>{w?<div className="forecast-days">{w.daily.time.map((time:string,i:number)=>({time,i})).filter(({time}:any)=>time>=forecastToday).slice(0,5).map(({time,i}:{time:string;i:number})=><div className="forecast-day" key={time}><div><strong>{time===forecastToday?"Dzisiaj":new Intl.DateTimeFormat("pl-PL",{weekday:"long",timeZone:"Europe/Warsaw"}).format(new Date(time+"T12:00:00Z"))}</strong><span>{time.slice(8,10)}.{time.slice(5,7)}</span></div><WeatherIcon code={w.daily.weather_code[i]}/><div className="forecast-temp"><strong>{formatTemperature(w.daily.temperature_2m_max[i])}°</strong><span>{formatTemperature(w.daily.temperature_2m_min[i])}°</span></div><div className="forecast-rain"><Droplets size={13}/>{number(w.daily.precipitation_probability_max[i])}%</div></div>)}</div>:<div className="loading-block">{weather.loading?<Skeleton className="h-36 w-full"/>:<p>Prognoza chwilowo niedostępna</p>}</div>}<div className="card-foot"><span>Temperatura maks. / min. · szansa opadu</span></div></section></div>

 </section>
 <EnvironmentExtras weather={weather} forecast={pollenForecast}/>
 <WaterSection locality={locality} result={water}/>
 <WasteSection waste={locality.waste} today={today} weeks={wasteWeeks}/>
 <footer><div><p>Dane pogodowe i pomiarowe pobiera Twoja przeglądarka przy otwarciu strony, co godzinę i po kliknięciu „Odśwież dane”. Ostatnie odczyty zachowuje lokalnie na tym urządzeniu. Czas wyświetlany dla Polski.</p></div><div className="footer-sources"><Source href="https://open-meteo.com/">Open-Meteo</Source><Source href={locality.air.sourceUrls[0]}>Czujniki powietrza</Source><Source href="https://danepubliczne.imgw.pl/">IMGW-PIB</Source><Source href={locality.position.sourceUrl}>Punkt prognozy · PRNG</Source></div><p className="attribution">Kod strony jest publicznie dostępny na portalu GitHub. <Source href="https://github.com/strzelcu/szczedrzyk">Zobacz repozytorium</Source></p>
 <FeedbackContact />
 <p className="attribution">Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone. Dane operacyjne mogą podlegać korektom.</p><p className="attribution">Strona została wygenerowana przez AI i może zawierać błędy.</p>
 <p className="footer-brand w-full text-center">
   <a href="https://strzelcu.github.io/" className="inline-flex items-center gap-3 text-lg underline underline-offset-2">
     <img src={import.meta.env.BASE_URL + "programista-na-wsi.webp"} alt="" width={48} height={48} loading="lazy" className="shrink-0 object-contain"/>
     Programista na wsi
   </a>
 </p></footer>
 </main>
 {showBackToTop && <a className="back-to-top" href="#page-top"><ArrowUp size={18} aria-hidden="true"/>Na górę</a>}
 </>;
}
