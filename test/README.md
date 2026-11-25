# Dashboardy miejscowości gminy Ozimek

Katalog testowy obejmuje Ozimek i 13 sołectw. Każdy plik `localities/*.yaml` opisuje kompletną konfigurację miejscowości. Wspólny szablon tworzy z niego osobną stronę i odnośnik w katalogu. Instrukcja dodawania miejscowości, schemat i przykład są w [skillu `ozimek-dashboard`](skills/ozimek-dashboard/SKILL.md).

## Uruchomienie

Uruchom polecenia z katalogu głównego repozytorium, używając Node.js 24.

```sh
npm ci
npm ci --prefix test
npm run check --prefix test
npm run data --prefix test
npm run build --prefix test
npm run preview --prefix test
```

Adres podglądu kończy się na `/szczedrzyk/test/`. `PAGES_BASE_PATH=/` daje `/test/`. Krok `data` jest opcjonalny podczas pracy lokalnej. Zapisuje dane startowe w `test/public/data/`. Przeglądarka odświeża dane podczas otwierania strony, co godzinę i przy użyciu przycisku odświeżania. Każda sekcja ma własny stan błędu, a pamięć podręczna używa identyfikatora miejscowości i osobnych kluczy wersji testowej.

## Testy układu

```sh
npm exec --prefix test -- playwright install --only-shell chromium
npm run build --prefix test
npm run test:responsive --prefix test
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
- **Odpady.** Terminy dla zabudowy jednorodzinnej pochodzą z dziesięciu gminnych PDF-ów na 2026 r. Nowa Schodnia ma dwa harmonogramy z osobnym zakresem dla ul. Skrajnej. Kafelek u góry pokazuje wszystkie zweryfikowane odbiory od dziś do siódmego dnia włącznie. [Harmonogramy gminy](https://ozimek.pl/229-ochrona-srodowiska/32282-harmonogram-wywozu-odpadow.html)

## Publikacja i wycofanie

GitHub Actions dodaje `test/dist/` do publikowanego katalogu `dist/test/` po zbudowaniu wersji głównej i przejściu testów. Błąd walidacji, testów jednostkowych lub testów układu blokuje publikację. Aby wycofać całą wersję testową, wykonaj `git revert` commitu scalającego PR z tą wersją i opublikuj zmianę przez zwykły workflow Pages.
