const degrees = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export function formatTemperature(value: unknown) {
  if (value === null || value === undefined) return "—";
  const temperature = Number(value);
  if (!Number.isFinite(temperature)) return "—";
  return degrees.format(Math.abs(temperature) < 0.5 ? 0 : temperature);
}
