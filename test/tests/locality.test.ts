import assert from "node:assert/strict";
import test from "node:test";
import { checkLocality, readLocalities } from "../scripts/localities.mjs";
import { loadSource } from "../scripts/lib/sources.ts";
import { normalizeWarnings } from "../scripts/lib/local-warnings.ts";
import { weatherUrl } from "../scripts/lib/weather-data.ts";
import { rankedSensors } from "../src/lib/locality.ts";
import { formatTemperature } from "../src/lib/temperature.ts";
import { currentSchedules, wasteScheduleWeeks, type WasteSchedule } from "../src/lib/waste.ts";

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

test("air configurations keep all local sensors or the three nearest devices", () => {
  assert.deepEqual(rankedSensors(locality("ozimek")).map(sensor => [sensor.id, sensor.local]),
    [["8228", true], ["10318", true], ["8230", true]]);
  assert.deepEqual(rankedSensors(locality("krasiejow")).map(sensor => [sensor.id, sensor.local]), [["1530", true], ["10335", true]]);
  const fallbackIds = {
    biestrzynnik: ["8227", "10417", "8229"], chobie: ["7821", "8104", "1530"], jedlice: ["8229", "10417", "8228"],
    "krzyzowa-dolina": ["10335", "8230", "1530"], mnichus: ["7821", "1530", "10335"], "nowa-schodnia": ["8230", "8228", "10318"],
    pustkow: ["8229", "10417", "8228"], schodnia: ["8229", "8228", "8230"],
  };
  for (const [slug, ids] of Object.entries(fallbackIds)) {
    const sensors = rankedSensors(locality(slug));
    assert.deepEqual(sensors.map(sensor => sensor.id), ids, slug);
    assert.ok(sensors.every(sensor => !sensor.local), slug);
  }
});

test("a locality cannot mix its own sensors with substitutes or exceed three substitutes", () => {
  const ozimek = structuredClone(locality("ozimek"));
  ozimek.air.sensors.push(locality("dylaki").air.sensors[0]);
  const chobie = structuredClone(locality("chobie"));
  chobie.air.sensors.push(locality("dylaki").air.sensors[0]);
  for (const config of [ozimek, chobie]) {
    assert.throws(() => checkLocality(JSON.stringify(config), `${config.slug}.yaml`), /wyłącznie lokalne czujniki lub do trzech czujników zastępczych/);
  }
});

test("an unavailable station keeps its place and serves other configured readings", async () => {
  for (const slug of ["grodziec", "chobie"]) {
    const config = locality(slug);
    const requested: string[] = [];
    const result = await loadSource(config, "air", async url => {
      const id = url.split("/").at(-1)!;
      requested.push(id);
      const sensor = config.air.sensors.find(sensor => sensor.id === id)!;
      const data = id === "7821" ? [] : [{ value: 2, read_at: new Date().toISOString(), current_norm: "grade-a" }];
      return { id: Number(id), city: sensor.locality, address: sensor.address,
        sensors: [{ name: "pm2_5", data }, { name: "pm10", data }],
      };
    });
    assert.deepEqual(requested, slug === "grodziec" ? ["7821"] : ["7821", "8104", "1530"], slug);
    assert.deepEqual(result.failed, ["7821"], slug);
    assert.deepEqual(Object.keys(result.stations).sort(), requested.filter(id => id !== "7821").sort(), slug);
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

test("the week keeps every collection on days six and seven for both waste areas", () => {
  const weeks = wasteScheduleWeeks(locality("nowa-schodnia").waste.schedules, "2026-12-15");
  assert.deepEqual(weeks.map(({ schedule, collections }) => [schedule.region, collections]), [
    ["1", [{ date: "2026-12-22", fractions: ["mixed"] }]],
    ["8", [{ date: "2026-12-21", fractions: ["packaging", "paper"] }, { date: "2026-12-22", fractions: ["mixed"] }]],
  ]);
});

test("the week spans two schedule periods and ends on day seven", () => {
  const schedule: WasteSchedule = { ...locality("ozimek").waste.schedules[0],
    validFrom: "2026-12-01", validUntil: "2026-12-31", collections: [{ date: "2026-12-31", fractions: ["glass"] }],
  };
  const future: WasteSchedule = { ...schedule, validFrom: "2027-01-01", validUntil: "2027-12-31", collections: [
    { date: "2027-01-01", fractions: ["bio"] }, { date: "2027-01-03", fractions: ["mixed"] },
    { date: "2027-01-04", fractions: ["packaging"] },
  ] };
  const weeks = wasteScheduleWeeks([schedule, future], "2026-12-27");
  assert.deepEqual(weeks.map(week => [week.active, week.collections.map(entry => entry.date)]), [
    [true, ["2026-12-31"]], [false, ["2027-01-01", "2027-01-03"]],
  ]);
  assert.deepEqual(wasteScheduleWeeks([schedule], "2027-01-01"), []);
});
