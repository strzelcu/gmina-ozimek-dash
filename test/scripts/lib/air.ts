import { sensorLocality, type AirSensor } from "../../src/lib/locality.ts";
import { numeric, utcTimestamp } from "./environment-data.ts";

const grades = ["grade-a", "grade-b", "grade-c", "grade-d", "grade-e", "grade-f"];
export const airLabels = ["Bardzo dobry", "Dobry", "Umiarkowany", "Dostateczny", "Zły", "Bardzo zły"];
export const airFreshness = 6 * 3600000;

export function syngeosUrl(sensor: AirSensor) {
  return `https://api.syngeos.pl/api/public/data/device/${sensor.id}`;
}

export function matchesSensor(data: any, sensor: AirSensor) {
  return (data?.id === undefined || String(data.id) === sensor.id) && typeof data?.city === "string"
    && typeof data.address === "string" && Array.isArray(data.sensors)
    && sensorLocality(data.city) === sensorLocality(sensor.locality)
    && data.address.trim().toLocaleLowerCase("pl-PL") === sensor.address.trim().toLocaleLowerCase("pl-PL");
}

function latest(sensor: any, now: number) {
  const readings = Array.isArray(sensor?.data) ? sensor.data : [];
  let latest: { value: number; time: string; grade: number } | null = null;
  for (const reading of readings) {
    const value = numeric(reading.value);
    const time = utcTimestamp(reading.read_at);
    if (value === null || value < 0 || !time || Date.parse(time) > now + 60000 || (latest && latest.time >= time)) continue;
    latest = { value, time, grade: grades.indexOf(reading.current_norm) };
  }
  return latest;
}

export function normalizeAirSensor(data: any, sensor: AirSensor, now = Date.now()) {
  if (String(data?.id) !== sensor.id || !matchesSensor(data, sensor)) throw Error("Niezgodne urządzenie Syngeos");
  const pm25Sensor = data.sensors.find((sensor: any) => sensor.name === "pm2_5");
  const pm10Sensor = data.sensors.find((sensor: any) => sensor.name === "pm10");
  const pm25 = latest(pm25Sensor, now), pm10 = latest(pm10Sensor, now);
  if (!pm25 && !pm10) throw Error("Brak pomiarów pyłów ze stacji");

  const ranges = (sensor: any) => grades.map((grade, index) => {
    const range = sensor?.norm?.[grade.replace("-", "_")];
    return { label: airLabels[index], min: numeric(range?.gte), max: numeric(range?.lt) };
  });
  const indexTime = pm25 && pm10 ? [pm25.time, pm10.time].sort()[0] : null;
  const index = pm25 && pm10 && pm25.grade >= 0 && pm10.grade >= 0 ? Math.max(pm25.grade, pm10.grade) : null;
  return { pm25, pm10, index, indexTime, scales: { pm25: ranges(pm25Sensor), pm10: ranges(pm10Sensor) } };
}

export type AirReading = ReturnType<typeof normalizeAirSensor>;
