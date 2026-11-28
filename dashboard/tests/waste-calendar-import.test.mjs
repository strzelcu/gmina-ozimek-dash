import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readLocalities } from "../scripts/localities.mjs";
import { wasteCalendar } from "../scripts/waste-calendar.mjs";
import { wasteFractionLabel } from "../src/lib/waste.ts";

const output = new URL("../dist/", import.meta.url);
const client = process.env.KHAL_BIN ?? "khal";
const calendars = readLocalities().flatMap(locality => locality.waste.schedules.map(schedule => ({
  locality,
  schedule,
  fileName: wasteCalendar(locality, schedule).fileName,
})));

test("the build exports one file for each verified waste schedule", async () => {
  const files = (await readdir(output, { recursive: true })).map(path => path.replaceAll(sep, "/"))
    .filter(path => path.startsWith("calendars/") && path.endsWith(".ics"));
  assert.deepEqual(files.sort(), calendars.map(calendar => calendar.fileName).sort());
});

for (const { locality, schedule, fileName } of calendars) {
  test(`khal imports ${locality.name}, region ${schedule.region}, ${schedule.validFrom}`, async context => {
    const file = fileURLToPath(new URL(fileName, output));
    const contents = await readFile(file, "utf8");
    assert.ok(contents.endsWith("\r\n"));
    const lines = contents.trimEnd().split("\r\n");
    assert.ok(lines.every(line => !/[\r\n]/.test(line) && Buffer.byteLength(line) <= 75));
    assert.equal(lines.filter(line => line.startsWith("DTSTART;VALUE=DATE:")).length, schedule.collections.length);
    assert.equal(lines.filter(line => line.startsWith("DTEND;VALUE=DATE:")).length, schedule.collections.length);

    const directory = await mkdtemp(join(tmpdir(), "ozimek-calendar-import-"));
    context.after(() => rm(directory, { recursive: true, force: true }));
    const config = join(directory, "config");
    await writeFile(config, `[calendars]\n[[odpady]]\npath = ${join(directory, "events")}\n[locale]\ndateformat = %Y-%m-%d\nlongdateformat = %Y-%m-%d\nlocal_timezone = America/Los_Angeles\ndefault_timezone = Europe/Warsaw\n[sqlite]\npath = ${join(directory, "khal.db")}\n`);
    const run = args => execFileSync(client, ["--config", config, ...args], { encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "pipe"] });

    run(["import", "--batch", "-a", "odpady", file]);
    const json = run(["list", "--once", "--json", "start-date", "--json", "end-date", "--json", "title",
      "--json", "description", schedule.validFrom, schedule.validUntil]);
    const imported = json.trim().split("\n").flatMap(line => JSON.parse(line));
    const expected = schedule.collections.toSorted((a, b) => a.date.localeCompare(b.date)).map(pickup => ({
      "start-date": pickup.date,
      "end-date": pickup.date,
      title: `Odpady – ${pickup.fractions.map(wasteFractionLabel).join(", ")}`,
      description: `Rejon ${schedule.region} · ${schedule.coverage}\nZabudowa jednorodzinna. Wystaw pojemniki lub worki do 6:00 w dniu odbioru.`,
    }));
    assert.deepEqual(imported, expected);
    const events = await readdir(join(directory, "events"));
    assert.equal(events.filter(path => path.endsWith(".ics")).length, expected.length);
  });
}
