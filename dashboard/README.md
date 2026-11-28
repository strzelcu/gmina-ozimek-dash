# Dashboardy miejscowości gminy Ozimek

Katalog obejmuje Ozimek i 13 sołectw. Każdy plik `localities/*.yaml` opisuje kompletną konfigurację miejscowości. Wspólny szablon tworzy z niego osobną stronę i odnośnik w katalogu. Instrukcja dodawania miejscowości, schemat i przykład są w [skillu `ozimek-dashboard`](skills/ozimek-dashboard/SKILL.md). [Katalog gminy Ozimek](https://strzelcu.github.io/gmina-ozimek/)

## Uruchomienie

Uruchom polecenia z katalogu głównego repozytorium, używając Node.js 24.

```sh
npm ci
npm ci --prefix dashboard
npm run check --prefix dashboard
npm run data --prefix dashboard
npm run build --prefix dashboard
npm run preview --prefix dashboard
```

Domyślny adres podglądu kończy się na `/gmina-ozimek/`. Ustaw `DASHBOARD_BASE_PATH`, aby sprawdzić inną ścieżkę. Użyj tej samej wartości przy kompilacji, podglądzie i testach. Krok `data` jest opcjonalny podczas pracy lokalnej. Zapisuje dane startowe w `dashboard/public/data/`. Przeglądarka odświeża dane podczas otwierania strony, co godzinę i przy użyciu przycisku odświeżania. Każda sekcja ma własny stan błędu, a pamięć podręczna używa identyfikatora miejscowości.

Dashboardy działają bez analityki i śledzenia odwiedzin. Przeglądarka zachowuje lokalnie dane źródłowe, w tym prognozy, ostrzeżenia i odczyty, aby móc je wyświetlić przy chwilowym braku połączenia. [Zgłoszenia w repozytorium](https://github.com/strzelcu/gmina-ozimek-dash/issues)

## Kalendarz odbioru odpadów

Kompilacja generuje plik `.ics` z pełnym harmonogramem YAML dla danej miejscowości, rejonu i okresu. Po sprawdzeniu zmienionych terminów zaktualizuj pole `verifiedAt` w YAML. Panel **„Wywóz odpadów”** pokazuje datę wersji i przycisk pobrania przy każdym dostępnym harmonogramie.

Po kompilacji uruchom `npm run test:calendars --prefix dashboard`, aby zaimportować wszystkie pliki w kliencie `khal` i porównać zapisane wydarzenia z YAML. Klient `khal` może być dostępny w `PATH` lub pod ścieżką wskazaną zmienną `KHAL_BIN`. GitHub Actions sprawdza import i układ przed wdrożeniem.

## Testy układu

```sh
npm exec --prefix dashboard -- playwright install --only-shell chromium
npm run build --prefix dashboard
npm run test:responsive --prefix dashboard
```

Playwright sprawdza katalog i wszystkie strony miejscowości w Chromium przy 42 szerokościach od 320 do 1920 px. Sprawdza progi z CSS oraz zmiany liczby kolumn w siatkach katalogu i czujników, w tym 1 px przed i po każdej granicy. Scenariusze obejmują nawigację, odświeżanie, przewijanie tabel, wykresy, rozwijane sekcje oraz ładowanie i niedostępność danych. Testy używają stałych odpowiedzi API i daty wybranej na podstawie harmonogramu z YAML.

| Przejście do szerszego ekranu | Zmiana układu |
| --- | --- |
| 380 → 381 px | Odczyty PM oraz metryki słońca i pylenia przechodzą z jednej do dwóch kolumn. |
| 420 → 421 px | Ikona w nagłówku rośnie z 36 do 44 px. |
| 600 → 601 px | „Na dziś” i rodzaje odpadów przechodzą z jednej do dwóch kolumn. |
| 640 → 641 px | Wodowskazy przechodzą z jednej do dwóch kolumn, pylenie z dwóch do czterech. Na wykresach pojawiają się dodatkowe etykiety osi. |
| 760 → 761 px | Przycisk odświeżania i stopień ostrzeżenia przechodzą z układu pionowego na boczny. |
| 900 → 901 px | „Na dziś” przechodzi z dwóch do czterech kolumn, rodzaje odpadów z dwóch do trzech. |
| 1000 → 1001 px | Prognozy godzinowa i pięciodniowa ustawiają się obok siebie pod aktualną pogodą. |
| 1100 → 1101 px | Sześć metryk pogody trafia do jednego wiersza. |
| 1150 → 1151 px | Trzy wodowskazy mieszczą się w jednym wierszu. |

GitHub Actions uruchamia te testy także w pull requestach do `main`. Jeśli test układu zakończy się błędem, w artefaktach przebiegu znajdziesz zrzuty ekranu i ślady Playwright.

## Źródła

- **Geolokacja.** Pogoda, słońce, prognoza pylenia i odległości używają punktu z PRNG. Adres rekordu PRNG i kod SIMC są w YAML. [PRNG](https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-nazw-geograficznych-prng/) · [Open-Meteo](https://open-meteo.com/)
- **Powietrze.** Dashboard pokazuje wszystkie potwierdzone czujniki danej miejscowości. Gdy miejscowość nie ma własnych czujników, wyświetla trzy najbliższe potwierdzone urządzenia. Odległość liczona jest od punktu PRNG do współrzędnych czujnika. Brak odczytu i dane starsze od sześciu godzin są oznaczone przy urządzeniu. [Gmina Ozimek](https://ozimek.pl/#:~:text=Jako%C5%9B%C4%87%20powietrza%20w%20Gminie%20Ozimek) · [Syngeos](https://panel.syngeos.pl/) · [GIOŚ](https://powietrze.gios.gov.pl/pjp/current) · [Sensor.Community](https://maps.sensor.community/)
- **Wody.** Odległość do cieku jest liczona od punktu miejscowości do najbliższego odcinka osi cieku w MPHP. Kafelek pokazuje przypisane wodowskazy IMGW z odczytem stanu wody i datą pomiaru. Starsze odczyty mają osobne oznaczenie. Ostrzeżenia są filtrowane według powiatu i zlewni. [MPHP](https://dane.gov.pl/pl/dataset/2167%2Cmapa-podzialu-hydrograficznego) · [IMGW](https://danepubliczne.imgw.pl/api/data/hydro/format/html)
- **Odpady.** Terminy dla zabudowy jednorodzinnej pochodzą z dziesięciu gminnych PDF-ów na 2026 r. Nowa Schodnia ma dwa harmonogramy z osobnym zakresem dla ul. Skrajnej. Kafelek u góry pokazuje wszystkie zweryfikowane odbiory od dziś do siódmego dnia włącznie. [Harmonogramy gminy](https://ozimek.pl/50229-ochrona-srodowiska-50229/32282-harmonogram-wywozu-odpadow-32282.html)

## Publikacja i wycofanie

Workflow głównej witryny `strzelcu/strzelcu.github.io` buduje wskazany commit `strzelcu/gmina-ozimek-dash`, dołącza `dashboard/dist/` jako `out/gmina-ozimek/` i publikuje przekierowanie z `/szczedrzyk/`. Błąd walidacji, testów jednostkowych lub testów układu blokuje wdrożenie. Aby wydać kolejną wersję lub ją cofnąć, zaktualizuj SHA źródła w workflow głównej witryny albo cofnij commit zmieniający tę wartość. [Workflow głównej witryny](https://github.com/strzelcu/strzelcu.github.io/blob/main/.github/workflows/pages.yml)
