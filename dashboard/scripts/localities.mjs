import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { parseDocument } from "yaml";
import { rankedSensors } from "../src/lib/locality.ts";

export const localityDirectory = fileURLToPath(new URL("../localities/", import.meta.url));
const schema = JSON.parse(readFileSync(new URL("../skills/ozimek-dashboard/references/locality.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv({ allErrors: true });
ajv.addFormat("date", date => /^\d{4}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date);
ajv.addFormat("https-url", value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
});
const validate = ajv.compile(schema);

function unique(values, label, fileName) {
  if (new Set(values).size !== values.length) throw Error(`${fileName}: powtarzające się ${label}`);
}

/** @returns {import("../src/lib/locality.ts").Locality} */
export function checkLocality(contents, fileName) {
  const document = parseDocument(contents);
  if (document.errors.length) throw Error(`${fileName}: ${document.errors[0].message}`);
  const config = document.toJS();
  if (!validate(config)) throw Error(`${fileName}: ${ajv.errorsText(validate.errors)}`);
  if (fileName !== `${config.slug}.yaml`) throw Error(`${fileName}: nazwa pliku musi odpowiadać polu slug`);

  const sensors = rankedSensors(config);
  unique(sensors.map(sensor => sensor.id), "identyfikatory czujników", fileName);
  const fallbackCount = sensors.filter(sensor => !sensor.local).length;
  if (fallbackCount > 0 && (fallbackCount !== sensors.length || fallbackCount > 3)) {
    throw Error(`${fileName}: wpisz wyłącznie lokalne czujniki lub do trzech czujników zastępczych`);
  }
  unique(config.water.rivers.map(river => river.name), "nazwy cieków", fileName);
  unique(config.water.rivers.flatMap(river => river.gauges.map(gauge => gauge.id)), "identyfikatory wodowskazów", fileName);

  for (const schedule of config.waste.schedules) {
    unique(schedule.collections.map(entry => entry.date), `daty w rejonie ${schedule.region}`, fileName);
    if (schedule.collections.some(entry => entry.date < schedule.validFrom || entry.date > schedule.validUntil)) {
      throw Error(`${fileName}: termin odbioru poza okresem rejonu ${schedule.region}`);
    }
  }
  return config;
}

export function readLocalities() {
  const files = readdirSync(localityDirectory).filter(name => name.endsWith(".yaml")).sort();
  if (!files.length) throw Error("Brak konfiguracji miejscowości w dashboard/localities");
  const configs = files.map(name => checkLocality(readFileSync(new URL(`../localities/${name}`, import.meta.url), "utf8"), name));
  unique(configs.map(config => config.simc), "kody SIMC", "dashboard/localities");
  return configs;
}
