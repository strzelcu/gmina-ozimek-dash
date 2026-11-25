import type { Locality } from "../../src/lib/locality.ts";
import { normalizeAirSensor, syngeosUrl, type AirReading } from "./air.ts";
import { fetchJSON, numeric, utcTimestamp } from "./environment-data.ts";
import { normalizeWarnings, type WarningKind } from "./local-warnings.ts";
import { normalizeWeather, weatherUrl } from "./weather-data.ts";

export const hydroUrl = "https://danepubliczne.imgw.pl/api/data/hydro/";
export const dataSources = ["weather", "air", "water", "warnings"] as const;
export type DataSource = typeof dataSources[number];

export type WaterReading = {
  id: string;
  name: string;
  river: string;
  level: number | null;
  time: string | null;
  warning: number | null;
  alarm: number | null;
  flow: number | null;
  flowTime: string | null;
};
type SourceData = {
  weather: ReturnType<typeof normalizeWeather>;
  air: { stations: Record<string, AirReading>; failed: string[] };
  water: { stations: WaterReading[] };
  warnings: { warnings: ReturnType<typeof normalizeWarnings>; failed: WarningKind[]; checkedAt: string };
};
export type Reading<T extends DataSource> = SourceData[T] & { sourceFetchedAt: string };
export type Result<T extends DataSource> = { data: Reading<T> | null; loading: boolean; error: boolean };

const loaders: { [T in DataSource]: (locality: Locality, get: typeof fetchJSON) => Promise<SourceData[T]> } = {
  async weather(locality, get) {
    return normalizeWeather(await get(weatherUrl(locality.position)));
  },
  async air(locality, get) {
    const results = await Promise.allSettled(locality.air.sensors.map(async sensor => ({
      id: sensor.id,
      reading: normalizeAirSensor(await get(syngeosUrl(sensor)), sensor),
    })));
    const stations: Record<string, AirReading> = {};
    const failed: string[] = [];
    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") stations[result.value.id] = result.value.reading;
      else failed.push(locality.air.sensors[index].id);
    }
    return { stations, failed };
  },
  async water(locality, get) {
    const courses = locality.water.rivers.flatMap(river => river.gauges.map(gauge => ({ gauge, river: river.name })));
    if (!courses.length) return { stations: [] };
    const records = await get(hydroUrl);
    if (!Array.isArray(records)) throw Error("Niepoprawne pomiary hydrologiczne IMGW");
    const byId = new Map(records.map(row => [String(row.id_stacji), row]));
    const stations = courses.flatMap(({ gauge, river }) => {
      const row = byId.get(gauge.id);
      if (row?.rzeka !== river || row.stacja !== gauge.name) return [];
      return [{ id: gauge.id, name: gauge.name, river,
        level: numeric(row.stan_wody), time: utcTimestamp(row.stan_wody_data_pomiaru),
        warning: numeric(row.stan_ostrzegawczy), alarm: numeric(row.stan_alarmowy),
        flow: numeric(row.przeplyw), flowTime: utcTimestamp(row.przeplyw_data),
      }];
    });
    return { stations };
  },
  async warnings(locality, get) {
    const types: WarningKind[] = locality.warnings.catchments.length ? ["meteo", "hydro"] : ["meteo"];
    const results = await Promise.allSettled(types.map(async type => normalizeWarnings(
      await get(`https://danepubliczne.imgw.pl/api/data/warnings${type}`), type, locality.warnings,
    )));
    const failed = types.filter((_, index) => results[index].status === "rejected");
    if (failed.length === types.length) throw Error("Brak ostrzeżeń z API IMGW");
    return {
      warnings: results.flatMap(result => result.status === "fulfilled" ? result.value : []),
      failed,
      checkedAt: new Date().toISOString(),
    };
  },
};

export async function loadSource<T extends DataSource>(locality: Locality, type: T, get = fetchJSON): Promise<Reading<T>> {
  return { ...await loaders[type](locality, get), sourceFetchedAt: new Date().toISOString() };
}
