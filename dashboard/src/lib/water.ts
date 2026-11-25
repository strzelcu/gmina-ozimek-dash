import type { WaterReading } from "../../scripts/lib/sources.ts";
import type { Watercourse } from "./locality.ts";

export type MeasuredWaterLevel = WaterReading & { level: number; time: string };

function hasWaterLevel(reading: WaterReading | null | undefined): reading is MeasuredWaterLevel {
  return reading != null && Number.isFinite(reading.level)
    && typeof reading.time === "string" && Number.isFinite(Date.parse(reading.time));
}

export function riversWithWaterLevels(rivers: Watercourse[], stations: WaterReading[]) {
  const readings = new Map(stations.filter(hasWaterLevel).map(reading => [reading.id, reading]));
  return rivers.flatMap(river => {
    const gauges = river.gauges.flatMap(gauge => {
      const reading = readings.get(gauge.id);
      return reading ? [{ gauge, reading }] : [];
    });
    return gauges.length ? [{ river, gauges }] : [];
  }).sort((a, b) => a.river.distanceKm - b.river.distanceKm);
}
