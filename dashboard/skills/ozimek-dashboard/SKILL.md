---
name: ozimek-dashboard
description: Dodawaj i odtwarzaj dashboardy polskich miejscowości z YAML. Stosuj do weryfikacji źródeł, tworzenia konfiguracji, sprawdzania układu i publikowania przez GitHub Pages.
---

# Odtwarzanie dashboardu miejscowości

Użyj wspólnego szablonu i dodaj dla każdej miejscowości jeden plik `dashboard/localities/<slug>.yaml`. Kompilacja wczytuje te pliki automatycznie, tworzy katalog i generuje bezpośrednie adresy `/gmina-ozimek/<slug>/`. Pracuj na osobnej gałęzi. Bieżący zakres publikacji obejmuje Ozimek i 13 sołectw. Do próby z inną miejscowością użyj osobnej kopii roboczej, a jej konfigurację dodaj do publikowanego katalogu po uzgodnieniu zakresu.

## Zweryfikuj dane i uzupełnij YAML

Skopiuj [przykład](assets/szczedrzyk.example.yaml) i uzupełnij pola zgodnie ze [schematem](references/locality.schema.json). Przykład pokazuje też poprawne puste listy. Slug zapisz małymi literami ASCII z łącznikami. Nazwa pliku odpowiada slugowi. Zapisuj SIMC, kody powiatów i identyfikatory urządzeń jako ciągi znaków, a daty jako `YYYY-MM-DD`. W polach źródłowych zachowaj publiczne adresy HTTPS do rekordów i dokumentów.

1. **Miejscowość i położenie.** Potwierdź nazwę, rodzaj, gminę i kod SIMC. Dla miejscowości o tej samej nazwie porównaj SIMC i gminę. Ustaw `kind: city` dla miasta i `kind: village` dla sołectwa. Urzędowe nazwy przysiółków i części wsi zapisz w opcjonalnej liście `parts` w YAML wsi nadrzędnej. Szablon pokazuje je wewnątrz odnośnika pod nazwą sołectwa w katalogu i pod tytułem dashboardu, także podczas ładowania. Zapisz punkt miejscowości w WGS84 oraz URL rekordu w `position`. Użyj tej samej pary współrzędnych dla pogody, nasłonecznienia, pylenia i obliczeń odległości. [TERYT](https://eteryt.stat.gov.pl/) · [PRNG](https://prng.geoportal.gov.pl/)
2. **Ostrzeżenia.** Ustaw czterocyfrowy `countyTeryt` dla komunikatów meteorologicznych. Dla ostrzeżeń hydrologicznych zapisz właściwe województwo i zlewnie z aliasami zgodnymi z opisami IMGW. Brak potwierdzonych zlewni zapisz jako `catchments: []`. [API IMGW](https://danepubliczne.imgw.pl/pl/apiinfo)
3. **Powietrze.** Porównaj wykaz gminny oraz katalogi PM2,5 i PM10, również w sąsiednich gminach. Sprawdź identyfikator, miejscowość, adres i współrzędne urządzenia w publicznym API oraz otwórz link do stacji. Jeśli są potwierdzone czujniki w miejscowości, wpisz wszystkie lokalne. W pozostałych przypadkach wpisz do trzech najbliższych potwierdzonych czujników spoza miejscowości, mierzonych w linii prostej od punktu PRNG. Zachowaj w YAML znane urządzenie przy chwilowym braku odczytu. Przy braku potwierdzonych urządzeń użyj `sensors: []`. Kod w tej wersji obsługuje Syngeos. Źródła z innych sieci wymagają obsługi w schemacie i kodzie odczytu. [Syngeos PM10](https://api.syngeos.pl/api/v2/public/data/pm10) · [Syngeos PM2,5](https://api.syngeos.pl/api/v2/public/data/pm2_5) · [GIOŚ](https://powietrze.gios.gov.pl/pjp/current) · [Sensor.Community](https://maps.sensor.community/)
4. **Wody.** Zmierz w linii prostej odległość od punktu PRNG do najbliższych odcinków osi nazwanych cieków. Dobierz wodowskazy na tym samym cieku, uwzględniając zlewnię, dopływy i zapory. Zweryfikuj identyfikator, nazwę, położenie i datę pomiaru w IMGW. Użyj `gauges: []` dla cieku bez potwierdzonej stacji, a położenie wodowskazu na sąsiednim odcinku opisz w `note`. [MPHP](https://dane.gov.pl/pl/dataset/2167%2Cmapa-podzialu-hydrograficznego) · [Wodowskazy IMGW](https://danepubliczne.imgw.pl/api/data/hydro/format/html)
5. **Odpady.** Zapisz aktualny harmonogram gminy dla zabudowy jednorodzinnej, zasięg rejonu, okres ważności, datę weryfikacji i adres PDF. Otwórz wykaz gminy i sprawdź, czy prowadzi do aktualnych harmonogramów. Sprawdź wyjątki dla ulic i gabarytów. Frakcje odbierane tego samego dnia w jednym rejonie zapisz we wspólnym terminie. Dla różnych rejonów i lat zachowaj osobne harmonogramy. Przy braku potwierdzonych terminów zostaw link do wykazu gminy i `schedules: []`. [Przykład wykazu gminy Ozimek](https://ozimek.pl/50229-ochrona-srodowiska-50229/32282-harmonogram-wywozu-odpadow-32282.html)

## Zachowaj zachowanie szablonu

- Kafelek „Na dziś” pokazuje wszystkie odbiory od dziś do siódmego dnia włącznie, również dla kilku rejonów. Daty wyświetla w strefie `Europe/Warsaw`. Temperaturę zaokrągloną do zera wyświetla jako `0°C`.
- Kompilacja tworzy osobny plik `.ics` dla każdego harmonogramu w YAML. Każdy dzień odbioru jest jednym wydarzeniem całodniowym z listą frakcji. Po weryfikacji korekty terminów zaktualizuj `verifiedAt`. Zwinięta sekcja pod przyciskami pobrania wyjaśnia jednorazowy import do Kalendarza Google, Outlooka i iCloud.
- Przy czujniku spoza miejscowości etykieta „Spoza miejscowości” jest po prawej stronie nazwy. Adres ma osobny wiersz i może się zawijać. Starsze odczyty i chwilowe braki danych mają oznaczenia przy urządzeniu.
- Kafelek wód pokazuje wodowskaz z potwierdzonym poziomem i poprawną datą pomiaru. Cieki bez takich odczytów pomija. Gdy brak wszystkich odczytów, kafelek znika po zakończeniu ładowania.
- W katalogu rodzaj z YAML dobiera ikonę budynków dla miasta albo ikonę domu dla sołectwa. Katalog i dashboardy korzystają z `dashboard/src/components/DashboardFooter.tsx`. Stopka zawiera źródła danych, link do repozytorium, GitHub Issues, e-mail do zgłoszeń oraz informacje o braku śledzenia i wygenerowaniu strony przez AI. Linki do czujników i PRNG na dashboardzie wskazują źródła danej miejscowości.

## Przejdź cały workflow

Uruchom poniższe polecenia z katalogu głównego repozytorium w Node.js 24. Do sprawdzenia samego układu użyj stałych odpowiedzi API w testach Playwright. `npm run data --prefix dashboard` pobiera rzeczywiste dane startowe, a ostrzeżenia o niedostępnych źródłach wskazują pliki wymagające sprawdzenia.

```sh
npm ci
npm ci --prefix dashboard
node --test tests/*.test.ts
npm run check --prefix dashboard
npm run data --prefix dashboard
npm run build --prefix dashboard
npm run test:calendars --prefix dashboard
npm exec --prefix dashboard -- playwright install --only-shell chromium
npm run test:responsive --prefix dashboard
```

Test importu używa klienta `khal` dostępnego w `PATH` albo pod ścieżką wskazaną w `KHAL_BIN`.

1. Otwórz podgląd przez `npm run preview --prefix dashboard`. Domyślna ścieżka to `/gmina-ozimek/`. Jeśli ustawiasz `DASHBOARD_BASE_PATH`, użyj tej samej wartości do kompilacji, podglądu i testów. Sprawdź wpis w katalogu, bezpośredni adres dashboardu i zgodność jego danych z YAML. Zweryfikuj linki źródłowe, odczyty bieżące i stany braku danych.
2. Sprawdź wersję mobilną i szeroką. Testy Chromium obejmują wszystkie pliki YAML, karty, stopkę, kontrolki i przewijanie oraz szerokości po obu stronach breakpointów. Przy zmianie progów uzupełnij macierz w `dashboard/tests/browser/layout.ts`. [Tabela breakpointów i polecenia](../../README.md#testy-układu)
3. Umieść konfigurację i związane z nią poprawki w odwracalnym PR do `main`. Przejrzyj zmiany w `dashboard/localities/` i zaczekaj na walidację, testy jednostkowe oraz testy układu.
4. Po scaleniu zaktualizuj SHA źródła `strzelcu/gmina-ozimek-dash` w workflow repozytorium `strzelcu/strzelcu.github.io`. Workflow uruchamia te same testy przed publikacją i zapisuje raport Playwright, jeśli test układu zakończy się błędem. Błąd zatrzymuje wdrożenie.
5. Sprawdź wynik `build` i `deploy` oraz otwórz opublikowany katalog i nowy dashboard. Potwierdź ścieżki zasobów i plików danych. Cofnięcie commitu zmieniającego SHA w głównej witrynie publikuje poprzednią kompilację.

## Skopiuj wzorzec do innej gminy

1. Przenieś `dashboard/` razem ze schematem, przykładem i skryptami. Zachowaj zależności z głównego `package.json` i bramkę testów w workflow Pages. Ustaw pełną ścieżkę aplikacji w `DASHBOARD_BASE_PATH`, np. `/nowa-gmina/` albo `/` dla strony głównej domeny.
2. Dopasuj nagłówek i katalog w `dashboard/src/Header.tsx`, `dashboard/src/Directory.tsx` i `dashboard/index.html`. Zaktualizuj repozytorium i logo w `DashboardFooter.tsx`, a kontakt w `FeedbackContact.tsx`. Dostosuj oczekiwane nazwy i adresy w `dashboard/tests/browser/responsive.spec.ts` do tych ustawień.
3. Zastąp konfiguracje Ozimka potwierdzonymi YAML-ami nowej gminy i zaktualizuj testy jednostkowe odwołujące się do konkretnych stacji i harmonogramów Ozimka. Testy układu dobierają dashboardy z aktualnych YAML-ów i obsługują puste listy czujników, wodowskazów i harmonogramów.
