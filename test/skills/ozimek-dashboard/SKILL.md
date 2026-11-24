---
name: ozimek-dashboard
description: Dodaj lub zaktualizuj dashboard miejscowości na podstawie kopii dashboardu Szczedrzyka. Użyj przy weryfikacji geolokacji, przypisywaniu czujników, wodowskazów, ostrzeżeń IMGW lub harmonogramów odpadów w test/localities.
---

# Dashboard miejscowości

1. Potwierdź nazwę, rodzaj, przynależność do gminy i kod SIMC w [TERYT](https://eteryt.stat.gov.pl/). Odczytaj punkt miejscowości w WGS84 z [PRNG](https://prng.geoportal.gov.pl/). Użyj tej samej pary współrzędnych dla pogody, słońca, pylenia oraz obliczeń odległości. Dla homonimów sprawdź gminę i SIMC.
2. Utwórz `test/localities/<slug>.yaml` na podstawie [przykładu](assets/szczedrzyk.example.yaml) i [schematu](references/locality.schema.json). Slug zapisz małymi literami ASCII z łącznikami, np. `krzyzowa-dolina`. Dopasuj kod powiatu dla ostrzeżeń meteorologicznych i nazwy zlewni dla hydrologicznych do opisów publikowanych przez [IMGW](https://danepubliczne.imgw.pl/pl/apiinfo).
3. Sprawdź wykaz gminy i publiczne katalogi PM2,5 i PM10, także w sąsiednich gminach. Zapisz identyfikator, miejscowość, adres, współrzędne oraz link do stacji. Porównaj dane katalogowe z urządzeniem i wypróbuj jego publiczny odczyt. Wpisz wszystkie potwierdzone czujniki z danej miejscowości. Gdy ich brakuje, zmierz odległości od punktu PRNG tej miejscowości do urządzeń i wpisz do trzech najbliższych potwierdzonych czujników. Zarejestrowany czujnik z chwilowym brakiem odczytu zachowaj w konfiguracji. Przy braku potwierdzonego źródła użyj `sensors: []`. [Wykaz gminy](https://ozimek.pl/) · [Syngeos PM10](https://api.syngeos.pl/api/v2/public/data/pm10) · [Syngeos PM2,5](https://api.syngeos.pl/api/v2/public/data/pm2_5) · [GIOŚ](https://powietrze.gios.gov.pl/pjp/current) · [Sensor.Community](https://maps.sensor.community/)
4. Zmierz w linii prostej od punktu miejscowości do odcinków najbliższych nazwanych cieków w [MPHP](https://dane.gov.pl/pl/dataset/2167%2Cmapa-podzialu-hydrograficznego). Do każdego cieku przypisz dostępne wodowskazy z tej samej rzeki, biorąc pod uwagę odległość, zlewnię i położenie względem zapór lub dopływów. Odczytaj identyfikator, nazwę, współrzędne i datę pomiaru z [katalogu IMGW](https://danepubliczne.imgw.pl/api/data/hydro/format/html). Dla cieku bez przypisanej stacji użyj `gauges: []`. Kafelek wód pokazuje przypisane wodowskazy z odczytem stanu wody i datą pomiaru. Wodowskaz z sąsiedniego odcinka opisz w polu `note`.
5. Pobierz harmonogram gminy i sprawdź jego zasięg według adresu, okresu i typu zabudowy. Przepisz zweryfikowane daty, zachowując wyjątki dla ulic i odpadów wielkogabarytowych. W razie braku potwierdzonych terminów pozostaw link do wykazu gminy i `schedules: []`. Przy przełomie lat zachowaj oddzielne okresy ważności. [Harmonogramy gminy](https://ozimek.pl/229-ochrona-srodowiska/32282-harmonogram-wywozu-odpadow.html)
6. W katalogu głównym repozytorium wykonaj poniższe polecenia z Node.js 24. Katalog dashboardów i bezpośrednie strony miejscowości powstają w `test/dist/`. Porównaj nazwę, współrzędne, kolejność czujników i przypisanie wodowskazów z konfiguracją. Sprawdź też komunikaty o niedostępnych oraz starych odczytach.

   ```sh
   npm ci
   npm ci --prefix test
   npm run check --prefix test
   npm run build --prefix test
   ```

Zmiany konfiguracji zapisuj jako osobny commit. Publikacja GitHub Pages dołącza `test/dist/` pod ścieżką `/test/` względem adresu repozytorium.
