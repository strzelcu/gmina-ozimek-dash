import type { Position } from "../../src/lib/locality.ts";

export function weatherUrl(position: Position) {
  const params = new URLSearchParams({
    latitude: String(position.latitude),
    longitude: String(position.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,shortwave_radiation",
    hourly: "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,is_day,shortwave_radiation",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,sunshine_duration,uv_index_max",
    timeformat: "unixtime",
    timezone: "Europe/Warsaw",
    forecast_days: "5",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function normalizeWeather(data: any) {
  const { current, daily, hourly } = data ?? {};
  if (!Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.weather_code) || !Number.isFinite(data?.utc_offset_seconds)) {
    throw Error("Brak aktualnych warunków pogodowych");
  }
  const time = (value: string | number) => new Date(typeof value === "number"
    ? value * 1000
    : Date.parse(`${value}Z`) - data.utc_offset_seconds * 1000).toISOString();

  const dailyFields = ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "sunrise", "sunset"];
  const hourlyFields = ["temperature_2m", "precipitation_probability", "precipitation", "weather_code", "wind_speed_10m", "is_day"];
  const hasForecast = (forecast: any, fields: string[], count: number) => Array.isArray(forecast?.time) && forecast.time.length >= count
    && fields.every(field => Array.isArray(forecast[field]) && forecast[field].length === forecast.time.length);
  if (!hasForecast(daily, dailyFields, 1) || !hasForecast(hourly, hourlyFields, 24)) throw Error("Brak prognozy pogody");

  const polishDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });
  const dates = daily.time.map((value: string | number) => typeof value === "number" ? polishDay.format(value * 1000) : value);
  if (!dates.every((value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)))) {
    throw Error("Niepoprawne daty prognozy");
  }
  return {
    current: { ...current, time: time(current.time) },
    daily: { ...daily, time: dates, sunrise: daily.sunrise.map(time), sunset: daily.sunset.map(time) },
    hourly: { ...hourly, time: hourly.time.map(time) },
    fetchedAt: new Date().toISOString(),
    stale: false,
  };
}
