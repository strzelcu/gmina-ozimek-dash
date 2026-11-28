import { createHash } from "node:crypto";
import { wasteFractionLabel } from "../src/lib/waste.ts";

const calendarDate = date => date.replaceAll("-", "");

function dayAfter(date) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function calendarText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/[,;]/g, character => `\\${character}`);
}

function foldLine(line) {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts = [];
  let current = "";
  let length = 0;
  for (const character of line) {
    const bytes = Buffer.byteLength(character);
    if (length + bytes > 75) {
      parts.push(current);
      current = " ";
      length = 1;
    }
    current += character;
    length += bytes;
  }
  parts.push(current);
  return parts.join("\r\n");
}

const fingerprint = text => createHash("sha256").update(text).digest("hex");

/** @param {import("../src/lib/locality.ts").Locality} locality
 * @param {import("../src/lib/waste.ts").WasteSchedule} schedule */
export function wasteCalendar(locality, schedule) {
  const scope = `Rejon ${schedule.region} · ${schedule.coverage}`;
  const calendarName = `Odpady – ${locality.name} · rejon ${schedule.region}`;
  const stamp = `${calendarDate(schedule.verifiedAt)}T000000Z`;
  const groupId = fingerprint(JSON.stringify([locality.simc, locality.slug, scope, schedule.validFrom])).slice(0, 20);
  const description = calendarText(`${scope}\nZabudowa jednorodzinna. Wystaw pojemniki lub worki do 6:00 w dniu odbioru.`);
  const sourceUrl = new URL(schedule.sourceUrl).href;
  const events = schedule.collections.toSorted((a, b) => a.date.localeCompare(b.date)).flatMap(({ date, fractions: pickup }) => [
    "BEGIN:VEVENT",
    `UID:${groupId}-${calendarDate(date)}@strzelcu.github.io`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${calendarDate(date)}`,
    // The end date of an all-day event is exclusive.
    `DTEND;VALUE=DATE:${calendarDate(dayAfter(date))}`,
    `SUMMARY:${calendarText(`Odpady – ${pickup.map(wasteFractionLabel).join(", ")}`)}`,
    `DESCRIPTION:${description}`,
    `URL:${sourceUrl}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ]);
  const source = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Programista na wsi//Odbior odpadow//PL",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${calendarText(calendarName)}`,
    ...events,
    "END:VCALENDAR",
  ].map(foldLine).join("\r\n") + "\r\n";
  const region = schedule.region.replace(/[^a-z0-9]+/gi, "-");
  const fileName = `calendars/odpady-${locality.slug}-rejon-${region}-${schedule.verifiedAt}-${fingerprint(source).slice(0, 12)}.ics`;
  return { fileName, source };
}
