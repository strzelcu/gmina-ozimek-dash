export const fractions = {
  mixed: "Zmieszane",
  packaging: "Metale i tworzywa sztuczne",
  paper: "Papier",
  glass: "Szkło",
  bio: "Bioodpady",
  bulky: "Wielkogabarytowe",
} as const;
export type Fraction = keyof typeof fractions;
export type WasteSchedule = {
  region: string;
  coverage: string;
  housing: "single-family";
  validFrom: string;
  validUntil: string;
  verifiedAt: string;
  sourceUrl: string;
  collections: { date: string; fractions: Fraction[] }[];
};
export const polishDay = (now = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(now);
export function upcomingCollections(schedule: WasteSchedule, today: string) {
  return today >= schedule.validFrom && today <= schedule.validUntil
    ? schedule.collections.filter(entry => entry.date >= today).sort((a, b) => a.date.localeCompare(b.date))
    : [];
}
export function collectionsWithinWeek(schedule: WasteSchedule, today: string) {
  return collectionsWithinDays(schedule, today, 7);
}
export function collectionsWithinDays(schedule: WasteSchedule, today: string, days: number) {
  const end = new Date(today + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + days);
  const lastDay = end.toISOString().slice(0, 10);
  return upcomingCollections(schedule, today).filter(entry => entry.date <= lastDay);
}
export function relativeDay(date: string, today: string) {
  const days = Math.round((Date.parse(date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
  return days === 0 ? "Dzisiaj" : days === 1 ? "Jutro" : `Za ${days} dni`;
}
export function currentSchedules(schedules: WasteSchedule[], today: string) {
  return schedules.filter(schedule => today >= schedule.validFrom && today <= schedule.validUntil);
}
