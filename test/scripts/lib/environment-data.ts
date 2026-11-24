export async function fetchJSON(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/ld+json, application/json, */*" },
  });
  if (!response.ok) throw Error(`Źródło zwróciło HTTP ${response.status}`);
  return response.json();
}

export function numeric(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function utcTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = value.replace(" ", "T");
  const time = Date.parse(/(?:Z|[+-]\d\d:\d\d)$/i.test(iso) ? iso : `${iso}Z`);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
