import { expect, type Page } from "@playwright/test";

// Media-query transitions and automatic column transitions in the directory and air cards.
const transitions = [380, 420, 540, 592, 600, 640, 760, 834, 900, 1000, 1092, 1100, 1150];
export const widths = [320, ...transitions.flatMap(width => [width - 1, width, width + 1]), 1440, 1920];

export async function checkLayout(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  const failures = await page.evaluate(() => {
    const problems = new Set<string>();
    const width = window.innerWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const tolerance = 1;
    const label = (element: Element) => element.id ? `#${element.id}`
      : (element.getAttribute("class")?.split(" ")[0] || element.tagName.toLowerCase());
    const check = (condition: boolean, message: string) => {
      if (!condition) problems.add(message);
    };
    const fits = (rect: DOMRect, outer: { left: number; right: number }) =>
      rect.left >= outer.left - tolerance && rect.right <= outer.right + tolerance;
    const overlaps = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;
    const outsideScrollTables = (element: Element) => !element.closest(".hourly-scroll table, .sr-only");
    const visible = (element: Element) => element.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
    const panels = "header, main, footer, .card, .directory-heading, .directory-locality, .daily-summary-item, "
      + ".air-station, .water-station, .warning-entry, .forecast-day > div, .weather-metrics > div, "
      + ".environment-metrics > div, .aq-legend-row > span, .waste-next, .waste-fractions > li";

    check(document.documentElement.scrollWidth <= viewportWidth + tolerance, "Cała strona ma poziomy przewijak");
    for (const element of document.querySelectorAll("#root *")) {
      if (!outsideScrollTables(element) || element.parentElement?.closest("svg") || !visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const parent = element.parentElement?.closest(panels);
      check(fits(rect, { left: 0, right: viewportWidth }), `${label(element)} wychodzi poza ekran`);
      if (parent) check(fits(rect, parent.getBoundingClientRect()), `${label(element)} wychodzi poza ${label(parent)}`);
    }

    // Wrapping text can overflow even while its containing element fits.
    const texts = document.createTreeWalker(document.getElementById("root")!, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = texts.nextNode(); node; node = texts.nextNode()) {
      const parent = node.parentElement;
      const content = node.textContent?.trim();
      if (!content || !parent || parent.closest("svg, select") || !outsideScrollTables(parent) || !visible(parent)) continue;
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const panel = parent.closest(panels);
      if (panel) check(fits(rect, panel.getBoundingClientRect()), `Tekst „${content.slice(0, 60)}” wychodzi poza ${label(panel)}`);
    }

    function columns(container: Element, itemSelector: string, expected: number) {
      const boxes = Array.from(container.querySelectorAll(itemSelector), element => element.getBoundingClientRect());
      if (!boxes.length) return;
      const firstRow = boxes.filter(rect => Math.abs(rect.top - boxes[0].top) <= tolerance);
      check(firstRow.length === Math.min(expected, boxes.length), `${label(container)}: ${firstRow.length} kolumn zamiast ${Math.min(expected, boxes.length)}`);
      check(boxes.every((box, index) => index === 0 || !overlaps(box, boxes[index - 1])), `${label(container)}: elementy zachodzą na siebie`);
    }
    const flowColumns = (container: Element, minWidth: number, gap: number) =>
      Math.max(1, Math.floor((container.getBoundingClientRect().width + gap) / (minWidth + gap)));

    for (const grid of document.querySelectorAll(".directory-grid")) columns(grid, ":scope > li", flowColumns(grid, 246, 12));
    for (const grid of document.querySelectorAll(".daily-summary-grid")) columns(grid, ":scope > a", width <= 600 ? 1 : width <= 900 ? 2 : 4);
    for (const grid of document.querySelectorAll(".air-stations")) columns(grid, ":scope > article", flowColumns(grid, 250, 14));
    for (const grid of document.querySelectorAll(".pollutants")) columns(grid, ":scope > div", width <= 380 ? 1 : 2);
    for (const grid of document.querySelectorAll(".weather-details")) columns(grid, ".weather-metrics > div", width <= 1100 ? 3 : 6);
    for (const grid of document.querySelectorAll(".environment-metrics")) {
      const pollen = grid.closest('[aria-labelledby="pollen-title"]');
      const expected = width <= 380 ? 1 : pollen && width >= 641 && width <= 1100 ? 4
        : width <= 760 ? 2 : flowColumns(grid, 180, 16);
      columns(grid, ":scope > div", expected);
    }
    for (const grid of document.querySelectorAll(".water-grid")) columns(grid, ":scope > article", width <= 640 ? 1 : width <= 1150 ? 2 : flowColumns(grid, 280, 24));
    for (const grid of document.querySelectorAll(".waste-fractions")) columns(grid, ":scope > li", width <= 600 ? 1 : width <= 900 ? 2 : 3);

    const icon = document.querySelector(".brand-icon")!.getBoundingClientRect();
    check(Math.abs(icon.width - (width <= 420 ? 36 : 44)) <= tolerance, "Ikona nagłówka ma niewłaściwy rozmiar");
    for (const heading of document.querySelectorAll(".locality-heading")) {
      const title = heading.firstElementChild!.getBoundingClientRect();
      const refresh = heading.lastElementChild!.getBoundingClientRect();
      check(width <= 760 ? title.bottom <= refresh.top + tolerance : title.right <= refresh.left + tolerance,
        "Przycisk odświeżania w niewłaściwym miejscu względem nagłówka");
      check(visible(heading.querySelector(".location")!) === (width > 760), "Oznaczenie położenia ma niewłaściwą widoczność");
    }
    for (const summary of document.querySelectorAll(".warning-entry summary")) {
      const title = summary.firstElementChild!.getBoundingClientRect();
      const badge = summary.lastElementChild!.getBoundingClientRect();
      check(width <= 760 ? title.bottom <= badge.top + tolerance : title.right <= badge.left + tolerance,
        "Etykieta stopnia ostrzeżenia w niewłaściwym miejscu względem nazwy");
    }
    for (const station of document.querySelectorAll(".air-station")) {
      const name = station.querySelector("h3")!.getBoundingClientRect();
      const badge = station.querySelector(".air-station-heading .pill")?.getBoundingClientRect();
      const address = station.querySelector(".air-station-address")?.getBoundingClientRect();
      check(Boolean(badge && name.right <= badge.left + tolerance && Math.abs(name.top - badge.top) <= tolerance),
        `Etykieta obok ${station.querySelector("h3")!.textContent} spadła pod nazwę lub na nią nachodzi`);
      check(Boolean(badge && address && address.top >= Math.max(name.bottom, badge.bottom) - tolerance),
        "Adres czujnika musi mieścić się poniżej nazwy i etykiety");
    }

    for (const group of document.querySelectorAll(".weather-group")) {
      const weather = group.querySelector(".weather-card")!.getBoundingClientRect();
      const hourly = group.querySelector(".hourly-section")!.getBoundingClientRect();
      const daily = group.querySelector(".forecast-card")!.getBoundingClientRect();
      check(weather.bottom <= hourly.top + tolerance, "Prognoza godzinowa nachodzi na aktualne warunki");
      check(width <= 1000 ? hourly.bottom <= daily.top + tolerance
        : hourly.right <= daily.left + tolerance && Math.abs(hourly.top - daily.top) <= tolerance,
      "Prognoza pięciodniowa w niewłaściwym miejscu względem godzinowej");
    }

    for (const chart of document.querySelectorAll("svg.air-chart")) {
      const area = chart.getBoundingClientRect();
      const ticks = Array.from(chart.querySelectorAll("text"));
      const boxes = ticks.filter(tick => getComputedStyle(tick).display !== "none").map(tick => tick.getBoundingClientRect());
      check(boxes.every(rect => fits(rect, area) && rect.top >= area.top - tolerance && rect.bottom <= area.bottom + tolerance),
        `${chart.getAttribute("aria-labelledby")}: etykieta osi ucięta`);
      check(boxes.every((rect, index) => boxes.slice(0, index).every(other => !overlaps(rect, other))),
        `${chart.getAttribute("aria-labelledby")}: etykiety osi zachodzą na siebie`);
      check(ticks.filter(tick => tick.matches(".chart-tick-secondary"))
        .every(tick => (getComputedStyle(tick).display === "none") === (width <= 640)), "Niewłaściwa liczba etykiet osi na wykresie");
    }

    for (const scroll of document.querySelectorAll(".hourly-scroll")) {
      if (!visible(scroll)) continue;
      const overflow = scroll.scrollWidth > scroll.clientWidth + tolerance;
      const head = scroll.querySelector("th");
      check(!overflow || (getComputedStyle(scroll).overflowX === "auto" && !!head
        && head.getBoundingClientRect().width < scroll.clientWidth - 40), "Tabela nie ma dość miejsca do przewijania kolejnych kolumn");
    }
    return [...problems];
  });
  expect(failures, `Układ przy szerokości ${width} px`).toEqual([]);
}
