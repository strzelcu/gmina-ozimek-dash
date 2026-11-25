import { loadSource, type DataSource, type Reading, type Result } from "../../scripts/lib/sources.ts";
import type { Locality } from "./locality.ts";

const memory = new Map<string, unknown>();
const storageKey = (locality: Locality, type: DataSource) => `ozimek-test-v1:${locality.slug}:${type}`;

function valid<T extends DataSource>(type: T, data: any): data is Reading<T> {
  const age = Date.now() - Date.parse(data?.sourceFetchedAt);
  if (!Number.isFinite(age) || age < -60000) return false;
  if (type === "weather") {
    return age < 6 * 3600000 && data.current && Array.isArray(data.daily?.time) && Array.isArray(data.hourly?.time);
  }
  if (age >= 7 * 86400000) return false;
  if (type === "warnings") return Array.isArray(data.warnings) && Array.isArray(data.failed);
  if (type === "water") return Array.isArray(data.stations);
  return data.stations && typeof data.stations === "object" && !Array.isArray(data.stations) && Array.isArray(data.failed);
}

function remember<T extends DataSource>(key: string, data: Reading<T>) {
  memory.set(key, data);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* Storage can be disabled or full. */ }
}

export function cachedData<T extends DataSource>(locality: Locality, type: T): Reading<T> | null {
  const key = storageKey(locality, type);
  const inMemory = memory.get(key);
  if (valid(type, inMemory)) return inMemory;
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (valid(type, value)) {
      memory.set(key, value);
      return value;
    }
  } catch { /* Storage can be disabled or damaged. */ }
  return null;
}

async function publishedData<T extends DataSource>(locality: Locality, type: T): Promise<Reading<T> | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${locality.slug}/${type}.json`, {
      cache: "no-cache", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return valid(type, data) ? data : null;
  } catch { return null; }
}

export async function refreshData<T extends DataSource>(locality: Locality, type: T): Promise<Result<T>> {
  const key = storageKey(locality, type);
  const oldPromise = cachedData(locality, type) ?? publishedData(locality, type);
  const [live, old] = await Promise.all([loadSource(locality, type).catch(() => null), oldPromise]);
  if (!live) {
    if (old) remember(key, old);
    return { data: type === "weather" && old ? { ...old, stale: true } : old, loading: false, error: true };
  }

  if (type === "air" && old) {
    const next = live as Reading<"air">;
    const previous = old as Reading<"air">;
    for (const id of next.failed) {
      const reading = previous.stations[id];
      const recent = reading && [reading.pm25, reading.pm10].some(pm => pm && Date.now() - Date.parse(pm.time) < 7 * 86400000);
      if (recent) next.stations[id] = reading;
    }
  }
  if (type === "warnings" && old) {
    const next = live as Reading<"warnings">;
    const previous = old as Reading<"warnings">;
    next.warnings.push(...previous.warnings.filter(warning => next.failed.includes(warning.type)
      && (!warning.until || Date.parse(warning.until) > Date.now())));
  }
  remember(key, live);
  return { data: live, loading: false, error: false };
}
