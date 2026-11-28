import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { parseDocument } from "yaml";
import { rankedSensors } from "../src/lib/locality.ts";

export const localityDirectory = fileURLToPath(new URL("../localities/", import.meta.url));
export const pszokConfigPath = fileURLToPath(new URL("../pszok.yaml", import.meta.url));
const schemas = new URL("../skills/ozimek-dashboard/references/", import.meta.url);
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
const validate = ajv.compile(JSON.parse(readFileSync(new URL("locality.schema.json", schemas), "utf8")));
const validatePszok = ajv.compile(JSON.parse(readFileSync(new URL("pszok.schema.json", schemas), "utf8")));

function unique(values, label, fileName) {
  if (new Set(values).size !== values.length) throw Error(`${fileName}: powtarzające się ${label}`);
}

function parseYaml(contents, fileName) {
  const document = parseDocument(contents);
  if (document.errors.length) throw Error(`${fileName}: ${document.errors[0].message}`);
  return document.toJS();
}

/** @returns {import("../src/lib/locality.ts").Locality} */
export function checkLocality(contents, fileName) {
  const config = parseYaml(contents, fileName);
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

/** @returns {Map<string, import("../src/lib/waste.ts").Pszok>} */
export function readPszok() {
  const entries = parseYaml(readFileSync(pszokConfigPath, "utf8"), "pszok.yaml");
  if (!validatePszok(entries)) throw Error(`pszok.yaml: ${ajv.errorsText(validatePszok.errors)}`);
  return new Map(Object.entries(entries));
}
