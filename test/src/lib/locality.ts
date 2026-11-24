import type { WasteSchedule } from "./waste.ts";

export type Position = { latitude: number; longitude: number };
export type AirSensor = Position & {
  provider: "syngeos";
  id: string;
  locality: string;
  address: string;
  sourceUrl: string;
};
export type Gauge = Position & { id: string; name: string; note?: string };
export type Watercourse = { name: string; distanceKm: number; gauges: Gauge[] };
export type WarningScope = {
  countyTeryt: string;
  countyName: string;
  voivodeship: string;
  catchments: { name: string; aliases: string[] }[];
};
export type Locality = {
  schemaVersion: 1;
  slug: string;
  name: string;
  kind: "city" | "village";
  simc: string;
  municipality: string;
  region: string;
  position: Position & { sourceUrl: string };
  warnings: WarningScope;
  air: { sourceUrls: string[]; sensors: AirSensor[] };
  water: { sourceUrl: string; rivers: Watercourse[] };
  waste: { sourceUrl: string; schedules: WasteSchedule[] };
};

export function distanceKm(from: Position, to: Position) {
  const radians = Math.PI / 180;
  const latitudeDelta = (to.latitude - from.latitude) * radians;
  const longitudeDelta = (to.longitude - from.longitude) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.sin(longitudeDelta / 2) ** 2
    * Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians);
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function sensorLocality(value: string) {
  return value.normalize("NFC").trim().replace(/\s+gm\.\s+.+$/i, "").toLocaleLowerCase("pl-PL");
}

export function distanceLabel(km: number) {
  return km < 1
    ? `${Math.round(km * 1000).toLocaleString("pl-PL")} m`
    : `${km.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km`;
}

export function rankedSensors(locality: Locality) {
  return locality.air.sensors.map(sensor => ({
    ...sensor,
    distanceKm: distanceKm(locality.position, sensor),
    local: sensorLocality(sensor.locality) === sensorLocality(locality.name),
  })).sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}
