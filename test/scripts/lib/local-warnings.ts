import type { WarningScope } from "../../src/lib/locality.ts";
import { numeric, utcTimestamp } from "./environment-data.ts";

export type WarningKind = "meteo" | "hydro";

export function normalizeWarnings(data: any, type: WarningKind, scope: WarningScope, now = Date.now()) {
  if (!Array.isArray(data)) {
    if (typeof data?.message === "string" && /brak ostrzeżeń|no products were found/i.test(data.message)) return [];
    throw Error("Nieznany format ostrzeżeń IMGW");
  }

  const lower = (value: string) => value.normalize("NFC").toLocaleLowerCase("pl-PL");
  const aliases = scope.catchments.flatMap(area => area.aliases.map(lower));
  const rows = [];
  for (const record of data) {
    const areas = Array.isArray(record.obszary) ? record.obszary : [];
    const rawCodes = record.teryt ?? record.kody_teryt ?? areas.flatMap((area: any) => area.teryt ?? area.kod_teryt ?? []);
    const countyCodes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes]).map((code: any) => String(code?.teryt ?? code?.kod ?? code));
    if (type === "meteo" && !countyCodes.length) throw Error("Brak kodów powiatów w ostrzeżeniu");
    if (type === "hydro" && !areas.length) throw Error("Brak zlewni w ostrzeżeniu");

    const localAreas = areas.filter((area: any) => typeof area.opis === "string" && typeof area.wojewodztwo === "string"
      && lower(area.wojewodztwo) === lower(scope.voivodeship) && aliases.some(alias => lower(area.opis).includes(alias)));
    const relevant = type === "meteo" ? countyCodes.some(code => code.startsWith(scope.countyTeryt)) : localAreas.length > 0;
    if (!relevant) continue;

    const from = utcTimestamp(record.obowiazuje_od ?? record.data_od);
    const end = record.obowiazuje_do ?? record.data_do;
    const indefinite = String(end).startsWith("9999");
    const until = indefinite ? null : utcTimestamp(end);
    if (!from || (!until && !indefinite)) throw Error("Brak daty ostrzeżenia");
    if (until && Date.parse(until) <= now) continue;

    const title = record.nazwa_zdarzenia ?? record.zdarzenie;
    const description = record.tresc ?? record.przebieg;
    if (typeof title !== "string" || typeof description !== "string" || !title || !description) throw Error("Brak treści ostrzeżenia");
    rows.push({
      id: `${type}-${record.id ?? record.numer ?? title}-${from}`,
      type, title, description, from, until,
      level: numeric(record.stopien ?? record["stopień"]),
      area: type === "meteo" ? scope.countyName : localAreas.map((area: any) => area.opis).join(" · "),
      probability: numeric(record.prawdopodobienstwo),
    });
  }
  return rows.sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.from.localeCompare(b.from));
}
