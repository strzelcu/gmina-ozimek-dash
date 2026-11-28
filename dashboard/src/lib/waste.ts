export const fractions = {
  mixed: "Zmieszane",
  packaging: "Metale i tworzywa sztuczne",
  paper: "Papier",
  glass: "Szkło",
  bio: "Bioodpady",
  bulky: "Wielkogabarytowe",
} as const;
export type Fraction = keyof typeof fractions;

export const fractionEmoji = {
  mixed: "⚫",
  packaging: "🟡",
  paper: "🔵",
  glass: "🟢",
  bio: "🟤",
  bulky: "🛋️",
} satisfies Record<Fraction, string>;

export function wasteFractionLabel(fraction: Fraction) {
  return `${fractionEmoji[fraction]} ${fractions[fraction]}`;
}

export type Pszok = {
  name: string;
  address: string;
  entrance?: string;
  phone: string;
  hours: { days: string; opens: string; closes: string }[];
  closed?: string;
  requirements: string;
  accepted: string;
  sourceUrl: string;
};

export type WasteSchedule = {
  region: string;
  coverage: string;
  housing: "single-family";
  validFrom: string;
  validUntil: string;
  verifiedAt: string;
  sourceUrl: string;
  calendarFile?: string;
  collections: { date: string; fractions: Fraction[] }[];
};
export const polishDay = (now = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(now);
export function upcomingCollections(schedule: WasteSchedule, today: string) {
  const firstDay = today < schedule.validFrom ? schedule.validFrom : today;
  return schedule.collections
    .filter(entry => entry.date >= firstDay && entry.date <= schedule.validUntil)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function collectionsWithinWeek(schedule: WasteSchedule, today: string) {
  const end = new Date(today + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 7);
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

export function wasteScheduleWeeks(schedules: WasteSchedule[], today: string) {
  const active = new Set(currentSchedules(schedules, today));
  return schedules.map(schedule => ({ schedule, active: active.has(schedule), collections: collectionsWithinWeek(schedule, today) }))
    .filter(week => week.active || week.collections.length > 0);
}
