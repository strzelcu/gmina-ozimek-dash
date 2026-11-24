import assert from "node:assert/strict";
import test from "node:test";
import { checkLocality, readLocalities } from "../scripts/localities.mjs";
import { loadSource } from "../scripts/lib/sources.ts";
import { normalizeWarnings } from "../scripts/lib/local-warnings.ts";
import { weatherUrl } from "../scripts/lib/weather-data.ts";
import { rankedSensors } from "../src/lib/locality.ts";
import { formatTemperature } from "../src/lib/temperature.ts";
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

test("near-zero temperatures display as zero", () => {
  for (const value of [-0, -0.49, 0, 0.49]) assert.equal(formatTemperature(value), "0");
  assert.equal(formatTemperature(-0.5), "-1");
  assert.equal(formatTemperature(-3.6), "-4");
  assert.equal(formatTemperature(0.5), "1");
  assert.equal(formatTemperature(null), "—");
});

test("air configurations keep all local sensors or a single sensor from the nearest locality", () => {
  assert.deepEqual(rankedSensors(locality("ozimek")).map(sensor => [sensor.id, sensor.local]),
    [["8228", true], ["10318", true], ["8230", true]]);
  assert.deepEqual(rankedSensors(locality("krasiejow")).map(sensor => [sensor.id, sensor.local]), [["1530", true], ["10335", true]]);
  for (const [slug, name, id] of [
    ["biestrzynnik", "Dylaki", "8227"], ["chobie", "Grodziec", "7821"], ["jedlice", "Antoniów", "8229"],
    ["krzyzowa-dolina", "Krasiejów", "10335"], ["mnichus", "Grodziec", "7821"], ["nowa-schodnia", "Ozimek", "8230"],
    ["pustkow", "Antoniów", "8229"], ["schodnia", "Antoniów", "8229"],
  ]) {
    assert.deepEqual(rankedSensors(locality(slug)).map(sensor => [sensor.locality, sensor.id, sensor.local]), [[name, id, false]], slug);
  }
});

test("a locality cannot mix its own sensors with a fallback", () => {
  const ozimek = structuredClone(locality("ozimek"));
  ozimek.air.sensors.push(locality("dylaki").air.sensors[0]);
  assert.throws(() => checkLocality(JSON.stringify(ozimek), "ozimek.yaml"), /wyłącznie lokalne czujniki lub jeden czujnik zastępczy/);
});

test("a temporary outage retains the configured local or fallback station", async () => {
  for (const slug of ["grodziec", "chobie"]) {
    const requested: string[] = [];
    const data = await loadSource(locality(slug), "air", async url => {
      requested.push(url.split("/").at(-1)!);
      return { id: 7821, city: "Grodziec gm. Ozimek", address: "Tartaczna 1",
        sensors: [{ name: "pm2_5", data: [] }, { name: "pm10", data: [] }],
      };
    });
    assert.deepEqual(requested, ["7821"], slug);
    assert.deepEqual(data.failed, ["7821"], slug);
    assert.deepEqual(data.stations, {}, slug);
  }
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
