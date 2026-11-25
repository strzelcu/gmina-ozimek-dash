import type { Page } from "@playwright/test";
import { weatherUrl } from "../../scripts/lib/weather-data.ts";
import { syngeosUrl } from "../../scripts/lib/air.ts";
import { hydroUrl } from "../../scripts/lib/sources.ts";
import { dashboardBasePath } from "../../scripts/dashboard-path.mjs";
import { rankedSensors, type Locality } from "../../src/lib/locality.ts";

const hour = 3_600_000;
const day = 24 * hour;
const timestamp = (time: number) => new Date(time).toISOString();
const requestKey = (url: string) => {
  const { origin, pathname } = new URL(url);
  return origin + pathname;
};

// Choose a date with a collection on day seven using the newest YAML schedule.
export function layoutTime(locality: Locality) {
  const schedule = [...locality.waste.schedules].sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
  if (!schedule) return Date.UTC(2026, 0, 1, 6);
  const start = Date.parse(`${schedule.validFrom}T06:00:00Z`);
  const collection = schedule.collections.find(entry => Date.parse(`${entry.date}T06:00:00Z`) >= start + 7 * day);
  return collection ? Date.parse(`${collection.date}T06:00:00Z`) - 7 * day : start;
}

function forecast(now: number) {
  const midnight = Math.floor(now / day) * day;
  const hours = Array.from({ length: 48 }, (_, index) => (midnight + index * hour) / 1000);
  const days = Array.from({ length: 5 }, (_, index) => (midnight + index * day) / 1000);
  return {
    utc_offset_seconds: 3600,
    current: {
      time: now / 1000, temperature_2m: -0.4, apparent_temperature: -11.5, weather_code: 2, is_day: 1,
      relative_humidity_2m: 100, pressure_msl: 1052, wind_speed_10m: 20, wind_gusts_10m: 110,
      wind_direction_10m: 280, visibility: 34500, shortwave_radiation: 120,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, index) => index - 29),
      precipitation_probability: hours.map(() => 100),
      precipitation: hours.map(() => 10.2),
      weather_code: hours.map(() => 61),
      wind_speed_10m: hours.map(() => 110),
      is_day: hours.map(() => 1),
      shortwave_radiation: hours.map((_, index) => index % 24 === 12 ? 1080 : 110),
    },
    daily: {
      time: days,
      weather_code: days.map(() => 61),
      temperature_2m_max: days.map(() => -12),
      temperature_2m_min: days.map(() => -22),
      precipitation_probability_max: days.map(() => 100),
      sunrise: days.map(time => time + 7 * 3600),
      sunset: days.map(time => time + 18 * 3600),
      sunshine_duration: days.map(() => 12.5 * 3600),
      uv_index_max: days.map(() => 9.5),
    },
  };
}

export async function mockSources(page: Page, locality: Locality, options: {
  gate?: Promise<void>;
  offline?: boolean;
} = {}) {
  const now = layoutTime(locality);
  await page.clock.setFixedTime(now);
  const warning = {
    nazwa_zdarzenia: "Silny wiatr i intensywne opady deszczu",
    tresc: "IMGW prognozuje wystąpienie silnego wiatru i intensywnych opadów deszczu w ciągu najbliższej doby.",
    obowiazuje_od: timestamp(now - hour), obowiazuje_do: timestamp(now + day), prawdopodobienstwo: 90,
  };
  const catchment = locality.warnings.catchments[0];
  const sources = new Map<string, unknown>([
    [requestKey(weatherUrl(locality.position)), forecast(now)],
    ["https://air-quality-api.open-meteo.com/v1/air-quality", { hourly: {
      time: [now / 1000], grass_pollen: [145.2], birch_pollen: [1200.8], alder_pollen: [0], mugwort_pollen: [null],
    } }],
    [hydroUrl, locality.water.rivers.flatMap(river => river.gauges.map((gauge, index) => ({
      id_stacji: gauge.id, stacja: gauge.name, rzeka: river.name,
      stan_wody: [267, 210, 154][index % 3], stan_wody_data_pomiaru: timestamp(now - hour),
      stan_ostrzegawczy: 200, stan_alarmowy: 250, przeplyw: 120.98, przeplyw_data: timestamp(now - hour),
    })))],
    ["https://danepubliczne.imgw.pl/api/data/warningsmeteo", [
      { ...warning, stopien: 3, teryt: [locality.warnings.countyTeryt] },
    ]],
    ["https://danepubliczne.imgw.pl/api/data/warningshydro", catchment ? [{
      ...warning, nazwa_zdarzenia: "Przekroczenie stanu ostrzegawczego",
      obszary: [{ opis: catchment.aliases[0], wojewodztwo: locality.warnings.voivodeship }],
    }] : []],
  ]);
  for (const [index, sensor] of rankedSensors(locality).entries()) {
    const samples = (count: number) => ({
      id: sensor.id, city: sensor.locality, address: sensor.address,
      sensors: ["pm2_5", "pm10"].map((name, pollutant) => ({
        name,
        norm: { grade_a: { gte: 0, lt: 20 }, grade_b: { gte: 20, lt: 50 }, grade_c: { gte: 50, lt: 80 },
          grade_d: { gte: 80, lt: 120 }, grade_e: { gte: 120, lt: 180 }, grade_f: { gte: 180 } },
        data: Array.from({ length: count }, (_, i) => ({
          value: 102.5 + index * 20 + pollutant * 15 + i,
          read_at: timestamp(now - i * hour), current_norm: "grade-d",
        })),
      })),
    });
    sources.set(syngeosUrl(sensor), samples(1));
    sources.set(`${syngeosUrl(sensor)}/historical`, samples(index === 0 ? 25 : 20));
  }

  await page.route("**/*", async route => {
    const { origin, pathname } = new URL(route.request().url());
    if (origin === "http://127.0.0.1:4173") {
      // Ignore whatever data snapshot happened to be bundled into this build.
      if (pathname.startsWith(`${dashboardBasePath}data/`)) return route.fulfill({ status: 404 });
      return route.continue();
    }
    if (options.gate) await options.gate;
    const json = sources.get(origin + pathname);
    if (options.offline || json === undefined) return route.abort();
    await route.fulfill({ json, headers: { "access-control-allow-origin": "*" } });
  });
  return now;
}
