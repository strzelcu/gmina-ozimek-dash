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

## Źródła

- **Geolokacja.** Pogoda, słońce, prognoza pylenia i odległości używają punktu z PRNG. Adres rekordu PRNG i kod SIMC są w YAML. [PRNG](https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-nazw-geograficznych-prng/) · [Open-Meteo](https://open-meteo.com/)
- **Powietrze.** Dashboard pokazuje wszystkie potwierdzone czujniki danej miejscowości. Gdy miejscowość nie ma czujnika, dashboard pokazuje jeden z najbliższej miejscowości, która ma czujnik. Odległość porównano na podstawie punktów PRNG. Brak odczytu i dane starsze od sześciu godzin są oznaczone przy urządzeniu. [Gmina Ozimek](https://ozimek.pl/#:~:text=Jako%C5%9B%C4%87%20powietrza%20w%20Gminie%20Ozimek) · [Syngeos](https://panel.syngeos.pl/) · [GIOŚ](https://powietrze.gios.gov.pl/pjp/current) · [Sensor.Community](https://maps.sensor.community/)
- **Wody.** Odległość do cieku jest liczona od punktu miejscowości do najbliższego odcinka osi cieku w MPHP. Pokazano trzy najbliższe nazwane cieki i Małą Panew z lokalnymi wodowskazami IMGW. Ostrzeżenia są filtrowane według powiatu i zlewni. [MPHP](https://dane.gov.pl/pl/dataset/2167%2Cmapa-podzialu-hydrograficznego) · [IMGW](https://danepubliczne.imgw.pl/api/data/hydro/format/html)
- **Odpady.** Terminy dla zabudowy jednorodzinnej pochodzą z dziesięciu gminnych PDF-ów na 2026 r. Nowa Schodnia ma dwa harmonogramy z osobnym zakresem dla ul. Skrajnej. Widoczność terminów zależy od okresu ważności zapisanego w YAML. [Harmonogramy gminy](https://ozimek.pl/229-ochrona-srodowiska/32282-harmonogram-wywozu-odpadow.html)

## Publikacja i wycofanie

GitHub Actions dodaje `test/dist/` do publikowanego katalogu `dist/test/` po zbudowaniu wersji głównej. Aby wycofać całą wersję testową, wykonaj `git revert` commitu scalającego PR z tą wersją i opublikuj zmianę przez zwykły workflow Pages.
