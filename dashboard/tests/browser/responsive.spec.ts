import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readLocalities, readPszok } from "../../scripts/localities.mjs";
import { wasteCalendar } from "../../scripts/waste-calendar.mjs";
import { rankedSensors, type Locality } from "../../src/lib/locality.ts";
import { fractionEmoji, wasteFractionLabel } from "../../src/lib/waste.ts";
import { checkLayout, widths } from "./layout.ts";
import { mockSources } from "./sources.ts";

const localities: Locality[] = readLocalities();
const pszokPoints = readPszok();
const linkedSections = ["air-measurements", "weather-details", "pollen-title", "waste-details"];
const directoryLinkName = ({ name, kind }: Locality) => `${name} ${kind === "city" ? "Miasto" : "Sołectwo"}`;

async function openDashboard(page: Page, locality: Locality) {
  const document = await page.goto(`${locality.slug}/`);
  expect(document?.status()).toBe(200);
  // Inspect the generated HTML too. The application can set the title after a server fallback.
  const metadata = await page.evaluate(html => {
    const generated = new DOMParser().parseFromString(html, "text/html");
    return { title: generated.title, description: generated.querySelector('meta[name="description"]')?.getAttribute("content") };
  }, await document!.text());
  expect(metadata.title).toBe(`${locality.name} · Dashboard miejscowości`);
  expect(metadata.description).toContain(`${locality.name}, ${locality.municipality}.`);
  await expect(page.getByRole("heading", { level: 1, name: locality.name })).toBeVisible();
  const parts = page.locator(".locality-heading h1 + .locality-parts");
  if (locality.parts?.length) {
    await expect(parts).toBeVisible();
    await expect(parts).toHaveText(locality.parts.join(", "));
  } else {
    await expect(parts).toHaveCount(0);
  }
}

async function ready(page: Page, locality: Locality) {
  await expect(page.getByRole("button", { name: "Odśwież dane" })).toBeEnabled();
  if (locality.air.sensors.length) await expect(page.locator(".air-forecast svg")).toBeVisible();
  else await expect(page.getByText("Brak zweryfikowanych czujników w danych dla tej miejscowości.")).toBeVisible();
  await expect(page.getByText(/Godzina prognozy:/)).toBeVisible();
}

async function checkFooter(page: Page, locality?: Locality) {
  const footer = page.locator("main .dashboard-footer");
  await expect(footer).toHaveCSS("text-align", "center");
  await expect(footer.locator(".footer-sources a")).toHaveText(["Open-Meteo", "Czujniki powietrza", "IMGW-PIB", "Punkt prognozy · PRNG"]);
  await expect(footer.getByRole("link", { name: "Punkt prognozy · PRNG" })).toHaveAttribute("href", locality?.position.sourceUrl
    ?? "https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-nazw-geograficznych-prng/");
  await expect(footer.getByRole("link", { name: "Czujniki powietrza" })).toHaveAttribute("href", locality?.air.sourceUrls[0] ?? "https://panel.syngeos.pl/");
  await expect(footer.getByRole("link", { name: "Zobacz repozytorium" })).toHaveAttribute("href", "https://github.com/strzelcu/gmina-ozimek-dash");
  await expect(footer.getByRole("link", { name: "GitHub Issues" })).toHaveAttribute("href", "https://github.com/strzelcu/gmina-ozimek-dash/issues");
  await expect(footer.getByRole("link", { name: "mlody_analog3f@icloud.com" })).toHaveAttribute("href", "mailto:mlody_analog3f@icloud.com");
  await expect(footer.getByText("Dashboardy nie korzystają z narzędzi analitycznych, nie śledzą odwiedzin i nie zapisują historii Twojej aktywności na stronie.", { exact: true })).toBeVisible();
  await expect(footer.getByText("Strona została wygenerowana przez AI i może zawierać błędy.")).toBeVisible();
  const brand = footer.getByRole("link", { name: "Programista na wsi" });
  await expect(brand).toHaveAttribute("href", "https://strzelcu.github.io/");
  await expect(brand.locator("img")).toHaveAttribute("src", new URL(`${locality ? "../" : ""}programista-na-wsi.webp`, page.url()).pathname);
}

async function checkPszok(page: Page, locality: Locality) {
  const point = pszokPoints.get(locality.municipality);
  await expect(page.locator(".waste-pszok")).toHaveCount(point ? 1 : 0);
  if (!point) return;

  const card = page.locator("#waste-details").getByRole("article", { name: point.name, exact: true });
  await expect(card.getByRole("heading", { name: point.name, exact: true })).toBeVisible();
  await expect(card.getByText(point.address, { exact: true })).toBeVisible();
  if (point.entrance) await expect(card.getByText(point.entrance, { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: point.phone })).toHaveAttribute("href", `tel:${point.phone.replaceAll(" ", "")}`);
  await expect(card.getByRole("link", { name: "Zasady i limity" })).toHaveAttribute("href", point.sourceUrl);
  await expect(card.locator(".waste-pszok-hours dt")).toHaveText(point.hours.map(({ days }) => days));
  await expect(card.locator(".waste-pszok-hours dd")).toHaveText(point.hours.map(({ opens, closes }) => `${opens}–${closes}`));
  if (point.closed) await expect(card.getByText(point.closed, { exact: true })).toBeVisible();
  await expect(card.getByText(point.requirements, { exact: true })).toBeVisible();
  await expect(card.getByText(`Można oddać m.in. ${point.accepted}.`, { exact: true })).toBeVisible();
}

test("katalog miejscowości przy każdej szerokości", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboardy miejscowości" })).toBeVisible();
  await expect(page.getByText("Wersja testowa", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/PSZOK/)).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "Miejscowości gminy Ozimek" });
  await expect(navigation.getByRole("link")).toHaveCount(localities.length);
  for (const locality of localities) {
    const link = navigation.getByRole("link", { name: directoryLinkName(locality), exact: true });
    await expect(link).toHaveAttribute("href", new URL(`${locality.slug}/`, page.url()).pathname);
    const icon = locality.kind === "city" ? "building-2" : "house";
    await expect(link.locator(`svg.lucide-${icon}`)).toHaveAttribute("aria-hidden", "true");
    if (locality.parts?.length) {
      const parts = link.locator("strong + .locality-parts");
      const names = locality.parts.join(", ");
      await expect(parts).toBeVisible();
      await expect(parts).toHaveText(names);
      await expect(link).toHaveAccessibleDescription(names);
    } else {
      await expect(link.locator(".locality-parts")).toHaveCount(0);
    }
  }
  await checkFooter(page);
  for (const width of widths) await test.step(`${width} px`, () => checkLayout(page, width));
});

for (const locality of localities) {
  test(`${locality.name}: wszystkie sekcje przy każdej szerokości`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    const now = await mockSources(page, locality);
    await openDashboard(page, locality);
    await ready(page, locality);

    const summary = page.getByRole("region", { name: "Na dziś" });
    await expect(summary.getByRole("link")).toHaveCount(linkedSections.length);
    await expect(summary.getByText(/PSZOK/)).toHaveCount(0);
    for (const section of linkedSections) await expect(summary.locator(`a[href="#${section}"]`)).toBeVisible();
    await expect(summary.locator(".daily-summary-temperature strong")).toHaveText("0°C");
    await expect(page.locator(".big-temperature")).toHaveText("0°C");
    await expect(page.locator(".forecast-day")).toHaveCount(5);
    await expect(page.locator(".hourly-section th[scope=col]")).toHaveCount(25);
    await expect(page.locator(".weather-metrics > div")).toHaveCount(6);
    await expect(page.locator(".sun-times > div")).toHaveCount(2);
    await expect(page.locator('[aria-labelledby="sun-title"] .environment-metrics > div')).toHaveCount(3);
    await expect(page.locator('[aria-labelledby="pollen-title"] .environment-metrics > div')).toHaveCount(4);
    await expect(page.locator(".warning-entry")).toHaveCount(locality.warnings.catchments.length ? 2 : 1);
    await expect(page.locator(".pollutants > div")).toHaveCount(2 * locality.air.sensors.length);
    await expect(page.locator(".air-station .pill")).toHaveText(rankedSensors(locality).map(sensor => sensor.local ? "W miejscowości" : "Spoza miejscowości"));
    await expect(page.locator(".watercourse")).toHaveCount(locality.water.rivers.filter(river => river.gauges.length).length);
    await expect(page.locator(".water-station")).toHaveCount(locality.water.rivers.flatMap(river => river.gauges).length);
    await expect(page.getByText("Brak przypisanego wodowskazu IMGW.")).toHaveCount(0);

    const date = (offset: number) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10);
    const today = date(0);
    const last = date(7);
    const schedules = locality.waste.schedules.filter(schedule => today >= schedule.validFrom && today <= schedule.validUntil);
    const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
    const pickups = locality.waste.schedules.flatMap(schedule => schedule.collections
      .filter(entry => today <= entry.date && entry.date <= last)
      .map(entry => ({ date: entry.date, fractions: entry.fractions.map(wasteFractionLabel) }))).sort(byDate);
    for (const selector of [".summary-waste > ul > li", ".waste-next"]) {
      const displayed = await page.locator(selector).evaluateAll(cards => cards.map(card => ({
        date: card.querySelector("time")?.dateTime ?? "",
        fractions: Array.from(card.querySelectorAll(".waste-pickup-fractions > li"), item => item.textContent),
      })));
      expect(displayed.sort(byDate)).toEqual(pickups);
    }
    await expect(page.getByRole("link", { name: "Wykaz gminy", exact: true })).toHaveAttribute("href", locality.waste.sourceUrl);
    await expect(page.locator(".waste-fractions > li")).toHaveCount(6 * schedules.length);
    await expect(page.locator(".waste-fraction-icon")).toHaveText(schedules.flatMap(() => Object.values(fractionEmoji)));
    const downloads = locality.waste.schedules.filter(schedule => today <= schedule.validUntil);
    const calendar = page.locator(".waste-calendars");
    await expect(calendar.getByRole("link", { name: "Pobierz harmonogram (.ics)" })).toHaveCount(downloads.length);
    await expect(calendar.locator(".waste-download strong")).toHaveText(downloads.map(schedule => `Rejon ${schedule.region} · ${schedule.coverage}`));
    await expect(page.getByText("Jak zaimportować harmonogram?", { exact: true })).toHaveCount(0);
    await checkPszok(page, locality);
    if (!locality.waste.schedules.length) {
      await expect(summary.getByText("Brak aktualnego harmonogramu")).toBeVisible();
      await expect(page.getByText("Brak aktualnego harmonogramu w dashboardzie. Sprawdź wykaz gminy.")).toBeVisible();
    }
    await checkFooter(page, locality);

    // Expose the warning text, chart tables and air quality scale for layout checks.
    for (const disclosure of await page.locator("main details > summary").all()) await disclosure.click();
    await expect(page.locator(".aq-legend-row")).toHaveCount(locality.air.sensors.length ? 7 : 0);
    await expect(page.locator(".air-forecast tbody tr")).toHaveCount(locality.air.sensors.length ? 25 : 0);
    await expect(page.locator('[aria-labelledby="sun-title"] tbody tr').first()).toBeVisible();
    for (const width of widths) await test.step(`${width} px`, () => checkLayout(page, width));
    expect(pageErrors).toEqual([]);
  });
}

for (const width of [320, 1440]) {
  test(`nawigacja, odświeżanie, wybór czujnika i tabele przy ${width} px`, async ({ page }) => {
    const locality = localities.find(entry => entry.air.sensors.length > 1) ?? localities[0];
    await page.setViewportSize({ width, height: 900 });
    await mockSources(page, locality);
    await page.goto("./");
    await page.getByRole("link", { name: directoryLinkName(locality), exact: true }).click();
    await ready(page, locality);

    for (const section of linkedSections) {
      await page.locator(`.daily-summary-item[href="#${section}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${section}$`));
      await expect(page.locator(`#${section}`)).toBeInViewport();
    }
    const back = page.getByRole("link", { name: "Na górę", exact: true });
    await expect(back).toBeInViewport();
    await back.click();
    await expect(page.locator(".topbar")).toBeInViewport();
    await expect(back).toHaveCount(0);
    const forecastRefresh = page.waitForRequest(request => new URL(request.url()).pathname === "/v1/forecast");
    const refresh = page.getByRole("button", { name: "Odśwież dane" });
    await refresh.click();
    await forecastRefresh;
    await expect(refresh).toBeEnabled();

    const sensors = rankedSensors(locality);
    const sensor = sensors.at(-1);
    if (sensor) {
      if (sensors.length > 1) await page.getByLabel("Czujnik dla historii pomiarów").selectOption(sensor.id);
      await expect(page.locator(".air-forecast").getByRole("link", { name: `Syngeos · ${sensor.locality}, ${sensor.address}` }))
        .toHaveAttribute("href", sensor.sourceUrl);
      const history = page.getByText("Wartości godzinowe", { exact: true });
      const historyTable = page.locator(".air-forecast table");
      await expect(historyTable).toBeHidden();
      await history.click();
      await expect(historyTable).toBeVisible();
      await expect(historyTable.locator("tbody tr")).toHaveCount(sensors.length > 1 ? 20 : 25);
      await checkLayout(page, width);
      await history.click();
      await expect(historyTable).toBeHidden();
    }

    const hourly = page.getByRole("region", { name: /Prognoza godzinowa — przewiń/ });
    const reachedEnd = await hourly.evaluate(scroll => {
      scroll.scrollLeft = scroll.scrollWidth;
      const first = scroll.querySelector("thead th:first-child")!.getBoundingClientRect();
      const last = scroll.querySelector("thead th:last-child")!.getBoundingClientRect();
      const left = scroll.getBoundingClientRect().left + scroll.clientLeft;
      return scroll.scrollLeft > 0 && Math.abs(first.left - left) <= 1 && last.right <= left + scroll.clientWidth + 1;
    });
    expect(reachedEnd, "Przewijanie do ostatniej godziny zachowuje nagłówek po lewej").toBe(true);
    const logo = page.locator("footer img");
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Gmina Ozimek · katalog dashboardów" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Dashboardy miejscowości" })).toBeVisible();
  });
}

test("części wsi są pod tytułem już podczas ładowania dashboardu", async ({ page }) => {
  const locality = localities.find(entry => entry.slug === "krasiejow")!;
  const names = locality.parts!.join(", ");
  const chunk = Promise.withResolvers<void>();
  await mockSources(page, locality);
  await page.route(/\/assets\/Dashboard-[^/]+\.js$/, async route => {
    await chunk.promise;
    await route.continue();
  });
  try {
    await page.goto(`${locality.slug}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Wczytywanie dashboardu…", { exact: true })).toBeVisible();
    const parts = page.locator(".locality-title h1 + .locality-parts");
    await expect(parts).toBeVisible();
    await expect(parts).toHaveText(names);
    for (const width of [320, 1440]) await checkLayout(page, width);
  } finally {
    chunk.resolve();
  }
  await expect(page.locator(".locality-heading h1 + .locality-parts")).toHaveText(names);
});

test("pobieranie dwóch kalendarzy Nowej Schodni i wygasanie harmonogramów", async ({ page }) => {
  const locality = localities.find(entry => entry.slug === "nowa-schodnia")!;
  const now = await mockSources(page, locality);
  const today = new Date(now).toISOString().slice(0, 10);
  const schedules = locality.waste.schedules.filter(schedule => today <= schedule.validUntil);
  await page.setViewportSize({ width: 320, height: 900 });
  await openDashboard(page, locality);
  const calendar = page.locator(".waste-calendars");
  for (const [index, schedule] of schedules.entries()) {
    const link = calendar.getByRole("link", { name: "Pobierz harmonogram (.ics)" }).nth(index);
    await expect(link).toHaveAccessibleDescription(new RegExp(`^Rejon ${schedule.region} · `));
    const downloaded = page.waitForEvent("download");
    await link.click();
    const file = await downloaded;
    const expected = wasteCalendar(locality, schedule);
    expect(file.suggestedFilename()).toBe(expected.fileName.split("/").at(-1));
    expect(await readFile(await file.path(), "utf8")).toBe(expected.source);
  }
  const lastDay = locality.waste.schedules.map(schedule => schedule.validUntil).sort().at(-1)!;
  await page.clock.setFixedTime(Date.parse(`${lastDay}T23:59:59Z`));
  await page.reload();
  await expect(page.getByText("Brak aktualnego harmonogramu w dashboardzie. Sprawdź wykaz gminy.")).toBeVisible();
  await expect(calendar).toHaveCount(0);
  await expect(page.locator("#waste-details .waste-pszok")).toBeVisible();
});

test("ładowanie i niedostępne dane nie rozbijają układu", async ({ page }) => {
  const locality = localities.find(entry => entry.waste.schedules.length > 1) ?? localities[0];
  const gate = Promise.withResolvers<void>();
  await mockSources(page, locality, { gate: gate.promise, offline: true });
  try {
    await openDashboard(page, locality);
    await expect(page.getByRole("button", { name: "Pobieranie…" })).toBeDisabled();
    for (const width of [320, 760, 1001, 1440]) await test.step(`Ładowanie przy ${width} px`, () => checkLayout(page, width));
  } finally {
    gate.resolve();
  }
  await expect(page.getByRole("button", { name: "Odśwież dane" })).toBeEnabled();
  await expect(page.getByText("Pogoda chwilowo niedostępna.", { exact: false })).toBeVisible();
  if (locality.air.sensors.length) await expect(page.getByText("Historia pomiarów chwilowo niedostępna.")).toBeVisible();
  await expect(page.getByText(/Nie udało się odświeżyć prognozy pylenia/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Wody w okolicy" })).toHaveCount(0);
  for (const width of widths) await test.step(`Brak danych przy ${width} px`, () => checkLayout(page, width));
});
