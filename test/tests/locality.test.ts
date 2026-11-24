import assert from "node:assert/strict";
import test from "node:test";
import { readLocalities } from "../scripts/localities.mjs";
import { loadSource } from "../scripts/lib/sources.ts";
import { normalizeWarnings } from "../scripts/lib/local-warnings.ts";
import { weatherUrl } from "../scripts/lib/weather-data.ts";
import { rankedSensors } from "../src/lib/locality.ts";
import { currentSchedules } from "../src/lib/waste.ts";

const localities = readLocalities();
const locality = (slug: string) => localities.find(config => config.slug === slug)!;

test("the forecast sends the verified point of each locality", () => {
  const forecastUrls = localities.map(locality => {
    const url = new URL(weatherUrl(locality.position));
    assert.equal(Number(url.searchParams.get("latitude")), locality.position.latitude);
    assert.equal(Number(url.searchParams.get("longitude")), locality.position.longitude);
    return url.href;
  });
  assert.equal(new Set(forecastUrls).size, localities.length);
});

test("all three city sensors precede nearby stations and others are sorted by distance", () => {
  const sensors = rankedSensors(locality("ozimek"));
  assert.deepEqual(sensors.slice(0, 3).map(sensor => sensor.id), ["8228", "10318", "8230"]);
  assert.ok(sensors.slice(3).every(sensor => !sensor.local && sensor.distanceKm <= 10));
  assert.ok(sensors.slice(3).every((sensor, index, nearby) => index === 0 || sensor.distanceKm >= nearby[index - 1].distanceKm));
  const village = rankedSensors(locality("krasiejow"));
  assert.deepEqual(village.filter(sensor => sensor.local).map(sensor => sensor.id), ["1530", "10335"]);
  assert.ok(rankedSensors(locality("dylaki")).some(sensor => sensor.locality === "Kobylno"));
});

test("an unavailable Grodziec sensor is independent of successful nearby readings", async () => {
  const grodziec = locality("grodziec");
  const data = await loadSource(grodziec, "air", async url => {
    const id = url.split("/").at(-1)!;
    const sensor = grodziec.air.sensors.find(sensor => sensor.id === id)!;
    return { id: Number(id), city: `${sensor.locality} gm. Ozimek`, address: sensor.address,
      sensors: ["pm2_5", "pm10"].map(name => ({ name, data: id === "7821" ? [] : [
        { read_at: new Date().toISOString(), value: 0, current_norm: "grade-a" },
      ] })),
    };
  });
  assert.deepEqual(data.failed, ["7821"]);
  assert.equal(Object.keys(data.stations).length, grodziec.air.sensors.length - 1);
  assert.equal(data.stations["8228"].pm10?.value, 0);
});

test("only relevant water gauge IDs and waterways are used", async () => {
  const szczedrzyk = locality("szczedrzyk");
  const data = await loadSource(szczedrzyk, "water", async () => [
    { id_stacji: "150180050", stacja: "Ozimek", rzeka: "Mała Panew", stan_wody: "89", stan_wody_data_pomiaru: "2025-12-01 07:30:00" },
    { id_stacji: "150180020", stacja: "Turawa", rzeka: "Odra", stan_wody: "0" },
    { id_stacji: "150180190", stacja: "Krupski Młyn", rzeka: "Mała Panew", stan_wody: "22" },
  ]);
  assert.deepEqual(data.stations.map(row => row.id), ["150180050"]);
  assert.equal(data.stations[0].time, "2025-12-01T07:30:00.000Z");
});

test("hydrological warning areas come from the locality configuration", () => {
  const event = [{ zdarzenie: "Wzrost stanów wody", przebieg: "Ostrzeżenie testowe", data_od: "2026-11-01 00:00:00", data_do: "9999-12-31 23:59:59",
    obszary: [{ wojewodztwo: "opolskie", opis: "Zlewnia Jemielnicy" }],
  }];
  assert.equal(normalizeWarnings(event, "hydro", locality("ozimek").warnings).length, 0);
  assert.equal(normalizeWarnings(event, "hydro", locality("krzyzowa-dolina").warnings)[0]?.area, "Zlewnia Jemielnicy");
});

test("Nowa Schodnia keeps distinct street schedules and Jedlice keeps its own bulky pickup", () => {
  const schedules = currentSchedules(locality("nowa-schodnia").waste.schedules, "2026-05-01");
  const bulky = (schedule: typeof schedules[number]) => schedule.collections.find(term => term.fractions.includes("bulky"))?.date;
  assert.deepEqual(schedules.map(schedule => [schedule.region, bulky(schedule)]), [["1", "2026-05-11"], ["8", "2026-05-14"]]);
  assert.equal(bulky(locality("jedlice").waste.schedules[0]), "2026-05-13");
  assert.equal(bulky(locality("szczedrzyk").waste.schedules[0]), "2026-05-15");
  assert.equal(currentSchedules(schedules, "2027-01-01").length, 0);
});
