# PLAN.md - Opis Funkcjonalności Gry Tower Defense

## 1. Wprowadzenie

Niniejszy dokument opisuje szczegółowo funkcjonalności wymagane do stworzenia gry typu Tower Defense. Opis koncentruje się na *co* gra ma robić, a nie *jak* jest to zaimplementowane, pomijając nazwy klas, funkcji, konkretne wartości liczbowe, kolory czy nazwy frameworków. Celem jest stworzenie specyfikacji, która umożliwi odtworzenie gry przy użyciu dowolnego frameworka do tworzenia gier.

Gra jest dwuwymiarową grą Tower Defense osadzoną w siatce (grid-based), gdzie gracz umieszcza wieże obronne, aby powstrzymać fale nadchodzących przeciwników przed dotarciem do bazy głównej.

## 2. Konfiguracja Gry

System powinien pozwalać na konfigurację następujących parametrów:

* **Parametry Początkowe Gry:**
    * Początkowa ilość gotówki gracza.
    * Docelowa liczba klatek na sekundę (FPS) dla pętli aktualizacji.
* **Parametry Wizualne:**
    * Definicje kolorów dla tła, elementów UI, bazy gracza, baz wrogów, różnych typów wież i ich efektów.
* **Parametry Rozgrywki:**
    * Poziom trudności (np. poprzez liczbę aktywnych punktów spawnu wrogów), odczytywany z parametrów URL przy starcie gry.

## 3. Rdzeń Gry (Silnik)

* **Inicjalizacja:** Proces uruchamiający wszystkie systemy gry, wczytujący konfigurację i rozpoczynający główną pętlę.
* **Główna Pętla Aktualizacji:**
    * Wykonywana w stałych odstępach czasu (zgodnie z skonfigurowanym FPS).
    * Aktualizuje stan wszystkich aktywnych systemów i encji (kamera, mapa, menedżery encji, interfejs, fale wrogów, logika umieszczania wież).
    * Pętla powinna być pauzowana, gdy okno gry traci focus.
* **Główna Pętla Rysowania:**
    * Wykonywana tak często, jak to możliwe (np. za pomocą `requestAnimationFrame`).
    * Odpowiedzialna za renderowanie aktualnego stanu gry na ekranie.
    * Kolejność rysowania:
        1.  Wyczyszczenie tła canvas.
        2.  Zastosowanie transformacji kamery (przesunięcie, skalowanie).
        3.  Rysowanie siatki mapy.
        4.  Rysowanie aktywnych pocisków/efektów.
        5.  Rysowanie aktywnych wrogów (w tym pasków zdrowia).
        6.  Rysowanie elementów terenu mapy (bazy, przeszkody).
        7.  Rysowanie interfejsu umieszczania wież (podgląd wieży, zasięg, wskaźnik (nie)możliwości budowy).
        8.  Przywrócenie stanu kontekstu rysowania.
    * Pętla powinna być zatrzymywalna (np. w stanie Game Over).
* **Stan Zakończenia Gry (Game Over):**
    * Warunek zakończenia: Zniszczenie bazy głównej gracza.
    * Akcje po zakończeniu: Zatrzymanie pętli aktualizacji i rysowania, zatrzymanie generowania fal, wyświetlenie interfejsu "Game Over".

## 4. Systemy i Menedżery

### 4.1. System Rysowania (Canvas)

* Zarządza elementem HTML canvas.
* Dostarcza dostęp do kontekstu rysowania 2D.
* Obsługuje zmianę rozmiaru canvas w odpowiedzi na zmianę rozmiaru okna przeglądarki.
* Udostępnia funkcję do czyszczenia canvas (rysowania tła).
* Śledzi i udostępnia aktualną macierz transformacji kontekstu rysowania.
* Emituje zdarzenia związane ze zmianą rozmiaru.

### 4.2. System Kamery

* Zarządza widokiem (położeniem i skalą) świata gry.
* Przechowuje aktualne współrzędne (x, y) centrum widoku oraz współczynnik skali.
* Umożliwia przesuwanie widoku (góra, dół, lewo, prawo) za pomocą zdefiniowanych kontrolek (np. klawiszy strzałek). Ruch powinien być ograniczony do granic mapy.
* Umożliwia zmianę skali (zoom in/out) za pomocą zdefiniowanych kontrolek (np. kółka myszy). Skalowanie powinno odbywać się względem punktu (np. pozycji kursora).
* Umożliwia przesuwanie widoku poprzez przeciąganie myszą (aktywne tylko, gdy gracz nie jest w trybie umieszczania wieży).
* Aplikuje swoje transformacje (przesunięcie, skalowanie) do kontekstu rysowania przed renderowaniem elementów gry.
* Aktualizuje swoje wewnętrzne stany (np. pozycję podczas przeciągania) w pętli aktualizacji gry.

### 4.3. System Kontroli (Input)

* Nasłuchuje i przetwarza zdarzenia wejściowe użytkownika (klawiatura, mysz).
* Obsługuje zdarzenia klawiatury (np. naciśnięcie strzałek, klawisza Escape).
* Obsługuje zdarzenia myszy: kliknięcie, naciśnięcie przycisku, zwolnienie przycisku, ruch, wejście kursora na obszar canvas, opuszczenie obszaru canvas, kółko myszy.
* Śledzi aktualne współrzędne kursora myszy względem elementu canvas.
* Transformuje współrzędne ekranowe myszy na współrzędne świata gry, uwzględniając transformacje kamery.
* Śledzi, czy kursor myszy znajduje się nad obszarem canvas.
* Śledzi stan focusu okna przeglądarki (czy karta gry jest aktywna).
* Używa systemu zdarzeń (EventEmitter) do powiadamiania innych systemów o akcjach użytkownika (np. `keydown:KEY_NAME`, `click`, `mousedown`, `mouseup`, `wheel:up/down`, `focusin`, `focusout`).

### 4.4. System Mapy

* Definiuje strukturę świata gry jako siatkę o określonych wymiarach (szerokość, wysokość w jednostkach siatki) oraz rozmiar pojedynczej komórki siatki (w pikselach).
* Przechowuje dwuwymiarową tablicę reprezentującą stan każdej komórki (np. pusta, zajęta przez wieżę, zajęta przez przeszkodę, zajęta przez bazę).
* Zarządza elementami terenu:
    * Bazą główną gracza (umieszczoną w centralnym punkcie).
    * Bazami wrogów (punktami startowymi dla fal, ich liczba i pozycje zależą od poziomu trudności).
    * Przeszkodami (np. skałami, rozmieszczonymi na mapie, potencjalnie losowo).
* Odpowiada za rysowanie tła siatki i linii siatki.
* Odpowiada za rysowanie wszystkich elementów terenu.
* Integruje algorytm wyszukiwania ścieżek (A*):
    * Funkcja sprawdzająca, czy dana komórka siatki jest przechodnia (uwzględnia puste komórki i przechodnie elementy terenu).
    * Funkcja znajdująca najkrótszą ścieżkę między dwoma punktami na siatce.
    * Implementuje mechanizm cache'owania znalezionych ścieżek dla optymalizacji.
    * Udostępnia mechanizm unieważniania cache'a ścieżek, gdy struktura mapy się zmienia (np. po postawieniu wieży).
* Sprawdza możliwość umieszczenia wieży w danej komórce (i, j): komórka musi być pusta, a umieszczenie wieży nie może blokować ścieżki z żadnej bazy wroga do bazy gracza.
* Udostępnia funkcję do dodawania elementów (wież) do siatki, aktualizując jej stan przechodniości i unieważniając cache ścieżek.
* Udostępnia funkcje do konwersji współrzędnych (np. piksele na indeksy siatki).
* Zarządza stanem bazy głównej gracza (posiada punkty życia, obsługuje otrzymywanie obrażeń od wrogów, którzy dotarli).
* Emituje zdarzenia informujące o zmianach na mapie (np. dodanie elementu).

### 4.5. Menedżer Gotówki

* Śledzi aktualną ilość gotówki gracza.
* Inicjalizuje stan gotówki wartością początkową z konfiguracji.
* Udostępnia interfejs do:
    * Dodawania gotówki (np. za pokonanie wroga).
    * Sprawdzania, czy gracz posiada wystarczającą ilość gotówki na zakup.
    * Odejmowania gotówki (np. przy zakupie wieży).
* Aktualizuje wyświetlaną wartość gotówki w interfejsie użytkownika przy każdej zmianie.

### 4.6. Menedżer Wrogów

* Zarządza wszystkimi aktywnymi jednostkami wrogów.
* Przechowuje listę aktywnych wrogów.
* Udostępnia funkcję do dodawania nowych wrogów (np. wywoływaną przez Menedżera Fal).
* W pętli aktualizacji:
    * Aktualizuje stan każdego wroga (ruch, efekty, itp.).
    * Usuwa z listy wrogów, którzy zginęli.
* W pętli rysowania: Rysuje wszystkich aktywnych wrogów.
* Udostępnia funkcje pomocnicze:
    * Znajdowanie najbliższego wroga w danym promieniu od punktu.
    * Znajdowanie wszystkich wrogów w danym promieniu od punktu.
* Udostępnia funkcję sprawdzającą, czy wszyscy aktualni wrogowie mają ważną ścieżkę do bazy (potrzebne przy sprawdzaniu możliwości budowy wieży).
* Udostępnia funkcję do wymuszenia przeliczenia ścieżek dla wszystkich wrogów (potrzebne po zmianie mapy).

### 4.7. Menedżer Pocisków (Munitions)

* Zarządza wszystkimi aktywnymi pociskami i efektami wizualnymi strzałów (np. laserami).
* Przechowuje listę aktywnych pocisków.
* Udostępnia funkcję do dodawania nowych pocisków (wywoływaną przez wieże).
* W pętli aktualizacji:
    * Aktualizuje stan każdego pocisku (ruch, sprawdzanie kolizji/osiągnięcia celu).
    * Usuwa pociski, które trafiły w cel lub zniknęły z innych przyczyn.
* W pętli rysowania: Rysuje wszystkie aktywne pociski.

### 4.8. Menedżer Fal Wrogów

* Odpowiada za generowanie i wysyłanie fal przeciwników.
* Śledzi numer bieżącej fali.
* Definiuje strukturę fali: sekwencja grup wrogów. Każda grupa określa:
    * Typ wroga do stworzenia.
    * Opcjonalne modyfikatory statystyk (np. mnożnik życia, prędkości).
    * Liczbę wrogów w grupie.
    * Opóźnienie między pojawieniem się kolejnych wrogów w grupie.
* Implementuje logikę generowania fal:
    * Trudność fal rośnie wraz z ich numerem (więcej wrogów, silniejsi wrogowie, nowe typy wrogów).
    * Stosuje modyfikatory statystyk wrogów zależne od numeru fali.
    * Wprowadza różne typy wrogów (np. proste, opancerzone, szybkie, leczące, bossów) w określonych falach lub losowo.
* Zarządza cyklem fal:
    * Czeka określony czas między falami (konfigurowalny, np. 7 sekund), wyświetlając odliczanie w UI.
    * Generuje definicję następnej fali.
    * Iteruje przez grupy wrogów w fali, spawnując odpowiednią liczbę wrogów z każdej aktywnej bazy wroga, z odpowiednimi opóźnieniami i modyfikatorami.
    * Po zakończeniu spawnowania fali, zwiększa licznik fal i aktualizuje UI.
    * Posiada flagę umożliwiającą zatrzymanie generowania fal (np. przy Game Over).

### 4.9. System Umieszczania Wież

* Zarządza procesem wybierania i umieszczania wież przez gracza.
* Przechowuje stan, czy gracz jest aktualnie w trybie umieszczania wieży, oraz typ wybranej wieży.
* W pętli aktualizacji (gdy w trybie umieszczania):
    * Śledzi pozycję kursora myszy na siatce mapy (po transformacji przez kamerę).
    * Określa, czy kursor znajduje się nad poprawnym polem siatki.
* W pętli rysowania (gdy w trybie umieszczania i kursor nad siatką):
    * Rysuje podgląd wybranej wieży w komórce siatki pod kursorem.
    * Rysuje okrąg reprezentujący zasięg rażenia wieży.
    * Wizualnie sygnalizuje, czy umieszczenie wieży w danym miejscu jest możliwe (np. zmiana koloru podglądu, dodatkowy wskaźnik). Kryterium możliwości umieszczenia jest sprawdzane przez System Mapy.
* Obsługuje zdarzenie kliknięcia myszą (gdy w trybie umieszczania):
    * Sprawdza, czy umieszczenie jest możliwe w danej komórce (korzystając z Systemu Mapy).
    * Sprawdza, czy gracz ma wystarczająco gotówki (korzystając z Menedżera Gotówki).
    * Jeśli oba warunki są spełnione: odejmuje koszt wieży (Menedżer Gotówki) i dodaje wieżę do mapy (System Mapy). Potencjalnie wychodzi z trybu umieszczania lub pozwala na umieszczenie kolejnej wieży tego samego typu.
    * Jeśli brakuje gotówki, wyświetla powiadomienie (korzystając z Menedżera Interfejsu/Snackbar).
* Obsługuje anulowanie trybu umieszczania (np. przez naciśnięcie klawisza Escape lub kliknięcie prawym przyciskiem myszy).

### 4.10. Menedżer Interfejsu Użytkownika (UI)

* Odpowiada za aktualizację elementów HTML interfejsu poza głównym canvas.
* Przechowuje referencje do elementów DOM (np. dla licznika fal, gotówki, odliczania do następnej fali, panelu statystyk wież, ekranu Game Over, wersji gry, przycisków wyboru trudności).
* Udostępnia funkcje do aktualizacji treści tych elementów (np. `ustawNumerFali(n)`, `ustawGotowke(n)`, `ustawOdliczanie(sekundy)`).
* Generuje i obsługuje panel wyboru wież:
    * Dynamicznie tworzy elementy (np. małe canvasy) dla każdego dostępnego typu wieży.
    * Rysuje miniatury wież na tych elementach.
    * Dodaje obsługę zdarzeń (kliknięcie) do miniaturek, aby aktywować tryb umieszczania danej wieży (System Umieszczania Wież) i wyświetlić jej statystyki.
* Wyświetla szczegółowe informacje o wybranej wieży (nazwa, opis, koszt, zasięg, obrażenia, szybkostrzelność/DPS) w dedykowanym panelu statystyk.
* Zarządza systemem krótkich powiadomień (Snackbar):
    * Udostępnia funkcje do ustawiania tekstu, pokazywania i ukrywania powiadomienia.
    * Obsługuje powiadomienia tymczasowe (np. `toast("tekst", czas_trwania)`).
    * Wyświetla stałe powiadomienie, gdy okno gry traci focus, ukrywa je po odzyskaniu focusu.
* Wyświetla ekran "Game Over" po zakończeniu gry.
* Wyświetla wersję gry (odczytaną np. z pliku `package.json`).
* Wizualnie zaznacza aktywny poziom trudności.

### 4.11. Menedżer Parametrów URL

* Przy starcie gry odczytuje parametry z adresu URL.
* Udostępnia funkcję do pobrania poziomu trudności (np. liczby aktywnych punktów spawnu wrogów), w tym obsługę wartości domyślnych i walidację.

## 5. Encje Gry

Wszystkie encje powinny posiadać metody `update()` (aktualizującą logikę) i `draw()` (renderującą na canvas). Encje siatkowe (wieże, teren) dodatkowo przechowują swoje indeksy (i, j) i rozmiar.

### 5.1. Wieże (Towers)

* **Typy:** Muszą istnieć różne typy wież (np. Kanon, Gatling, Spowalniająca, Snajper, Laser).
* **Właściwości Ogólne (Wspólne):**
    * Pozycja (i, j na siatce; x, y w pikselach).
    * Rozmiar (szerokość/wysokość, zwykle rozmiar komórki siatki).
    * Koszt zakupu.
    * Zasięg celowania (promień).
    * Czas przeładowania (w milisekundach lub sekundach).
    * Obrażenia (mogą być stałe lub w zakresie min-max).
    * Nazwa i opis (do wyświetlania w UI).
    * Zestaw kolorów (główny, dodatkowy) do rysowania.
    * Referencja do aktualnego celu (wroga).
    * Stan wewnętrzny (np. licznik czasu do przeładowania, flaga gotowości do strzału).
    * Nieprzechodnie dla wrogów.
* **Zachowanie Ogólne:**
    * W pętli `update()`:
        * Wyszukuje najbliższego wroga w zasięgu (korzystając z Menedżera Wrogów).
        * Jeśli cel jest w zasięgu i wieża jest przeładowana, wykonuje akcję `shoot()`.
        * Śledzi czas przeładowania.
        * Obsługuje sytuacje, gdy cel zginie lub wyjdzie poza zasięg (szuka nowego celu).
    * W pętli `draw()`: Rysuje swoją bazę/korpus oraz ewentualne części ruchome (np. lufę) skierowane w stronę celu lub w domyślnym kierunku. Gdy kursor gracza jest nad wieżą, rysuje okrąg zasięgu.
* **Specyficzne Zachowania/Właściwości:**
    * **Kanon/Gatling:** W metodzie `shoot()` tworzy i dodaje pocisk (typu `BasicBullet`) do Menedżera Pocisków, celując w aktualnego wroga. Różnią się głównie czasem przeładowania, kosztem, obrażeniami. Gatling ma znacznie krótszy czas przeładowania. Wizualnie posiadają lufę obracającą się w kierunku celu.
    * **Snajper:** Duży zasięg, wysokie obrażenia, długi czas przeładowania. W metodzie `shoot()` tworzy i dodaje pocisk (typu `SniperBullet`) lub natychmiastowy efekt wizualny trafienia. Wizualnie posiada długą lufę.
    * **Laser:** Obrażenia zadawane w sposób ciągły, potencjalnie rosnące wraz z czasem skupienia na jednym celu (obrażenia min-max). W metodzie `shoot()` (lub `onNewTargetInRange`) tworzy i dodaje pocisk typu `Laser`, który utrzymuje się, dopóki cel jest żywy i w zasięgu. Wizualnie rysuje promień lasera między wieżą a celem, którego grubość/intensywność może zależeć od "naładowania".
    * **Spowalniająca:** Nie zadaje obrażeń. Zamiast strzelać pociskami, w pętli `update()` znajduje wszystkich wrogów w zasięgu i aplikuje im Efekt Spowolnienia. Wizualnie może emitować jakąś aurę lub oznaczenie obszaru działania.

### 5.2. Wrogowie (Enemies)

* **Typy:** Muszą istnieć różne typy wrogów (np. Prosty, Opancerzony, Szybki, Leczący, Boss).
* **Właściwości Ogólne:**
    * Punkty życia (HP).
    * Prędkość poruszania się.
    * Ilość gotówki przyznawana graczowi po pokonaniu.
    * Promień (do detekcji trafień).
    * Obrażenia zadawane bazie gracza, jeśli do niej dotrze.
    * Aktualna pozycja (x, y).
    * Aktualnie poniesione obrażenia.
    * Status (żywy/martwy).
    * Referencja do ścieżki, którą podąża (lista punktów).
    * Indeks aktualnego punktu docelowego na ścieżce.
    * Lista aktywnych efektów (np. spowolnienie, leczenie).
* **Zachowanie Ogólne:**
    * W pętli `update()`:
        * Jeśli ma ścieżkę i cel, porusza się w kierunku następnego punktu na ścieżce z określoną prędkością.
        * Po dotarciu do punktu docelowego, wybiera kolejny punkt ze ścieżki.
        * Jeśli dotrze do ostatniego punktu (bazy gracza), zadaje obrażenia bazie i jest usuwany z gry.
        * Aktualizuje wszystkie aktywne na sobie efekty.
    * W pętli `draw()`: Rysuje swoją reprezentację wizualną. Jeśli jest ranny, rysuje pasek zdrowia nad sobą.
    * Posiada metodę `takeDamage(amount)`: Zwiększa poniesione obrażenia. Jeśli obrażenia przekroczą HP, zmienia status na martwy i wywołuje `onDie()`.
    * Posiada metodę `heal(amount)`: Zmniejsza poniesione obrażenia (nie poniżej zera).
    * Posiada metodę `onDie()`: Przyznaje gotówkę graczowi (korzystając z Menedżera Gotówki).
    * Posiada metodę `getPath()`: Pobiera aktualną ścieżkę z Systemu Mapy.
    * Posiada metodę `updatePath()`: Wymusza ponowne pobranie ścieżki z Systemu Mapy (potrzebne po zmianie mapy).
    * Posiada metodę `addEffect(EffectType)`: Dodaje nowy efekt lub restartuje istniejący tego samego typu.
* **Specyficzne Zachowania/Właściwości:**
    * Różne typy wrogów mają różne wartości życia, prędkości, nagrody pieniężnej, promienia i wyglądu.
    * **Leczący:** W pętli `update()` wyszukuje pobliskich innych wrogów (korzystając z Menedżera Wrogów) i aplikuje im Efekt Leczenia. Wizualnie może pokazywać promienie leczące do celów.
    * **Boss:** Znacznie większa wytrzymałość i nagroda. Może mieć większy rozmiar/promień.

### 5.3. Pociski (Munitions)

* **Typy:** Muszą istnieć różne typy pocisków/efektów strzału (np. Zwykły Pocisk, Pocisk Snajperski, Laser).
* **Właściwości Ogólne:**
    * Aktualna pozycja (x, y).
    * Referencja do wieży, która wystrzeliła pocisk.
    * Referencja do celu (wroga).
    * Status (aktywny/nieaktywny).
* **Zachowanie Ogólne:**
    * W pętli `update()`:
        * Porusza się w kierunku celu lub po określonej trajektorii.
        * Sprawdza, czy cel nadal istnieje i jest żywy. Jeśli nie, pocisk staje się nieaktywny.
        * Sprawdza, czy osiągnął cel. Jeśli tak, zadaje obrażenia/aplikuje efekt i staje się nieaktywny.
    * W pętli `draw()`: Rysuje swoją reprezentację wizualną.
    * Posiada metodę `dealDamage()`: Aplikuje obrażenia celowi (odczytując wartość obrażeń z wieży-emitera).
* **Specyficzne Zachowania/Właściwości:**
    * **Zwykły Pocisk:** Porusza się ze stałą prędkością w kierunku aktualnej pozycji celu. Ma prostą wizualizację (np. koło).
    * **Pocisk Snajperski:** Może być reprezentowany jako natychmiastowa linia lub bardzo szybki pocisk. Zadaje wysokie obrażenia. Może mieć krótki czas życia (licznik klatek), po którym zadaje obrażenia, symulując trafienie.
    * **Laser:** Nie porusza się. W pętli `update()` zadaje obrażenia celowi w sposób ciągły (część obrażeń na klatkę), potencjalnie skalowane przez czas skupienia ("charge"). Pozostaje aktywny, dopóki cel jest żywy i w zasięgu wieży. Wizualnie rysuje linię między wieżą a celem.

### 5.4. Efekty (Effects)

* **Typy:** Muszą istnieć różne typy efektów (np. Spowolnienie, Leczenie).
* **Właściwości Ogólne:**
    * Referencja do wroga, na którego działa efekt.
    * Czas trwania lub licznik do zakończenia efektu.
    * Mechanizm powiadamiania o zakończeniu (callback `onUnmount`).
* **Zachowanie Ogólne:**
    * Aplikowany na wroga (dodawany do listy efektów wroga).
    * W pętli `update()` wroga, efekt jest również aktualizowany:
        * Aplikuje swoje działanie (np. modyfikuje statystykę wroga).
        * Dekrementuje licznik czasu trwania.
        * Jeśli czas się skończył, przywraca oryginalną statystykę wroga i wywołuje `onUnmount`, co powoduje usunięcie go z listy aktywnych efektów wroga.
    * Posiada metodę `restart()`: Resetuje licznik czasu trwania (gdy efekt jest aplikowany ponownie, zanim poprzedni wygasł).
    * Posiada metodę `stop()`: Natychmiast kończy działanie efektu i przywraca stan wroga.
* **Specyficzne Zachowania/Właściwości:**
    * **Spowolnienie:** Przy aktywacji zapamiętuje oryginalną prędkość wroga i ustawia ją na niższą wartość (np. połowę). Przy zakończeniu (`stop` lub `onUnmount`) przywraca zapamiętaną prędkość.
    * **Leczenie:** W każdej klatce `update()` dodaje punkty życia wrogowi (korzystając z metody `heal()`), do określonej wartości na sekundę.

### 5.5. Teren (Terrain)

* **Typy:** Baza Główna, Baza Wroga, Przeszkoda (Skała).
* **Właściwości Ogólne:**
    * Pozycja na siatce (i, j).
    * Rozmiar (szerokość/wysokość).
    * Przechodniość (czy wróg może przez to przejść).
    * Wizualna reprezentacja.
* **Specyficzne Zachowania/Właściwości:**
    * **Baza Główna:** Jest przechodnia. Ma punkty życia. Obsługuje przyjmowanie obrażeń. Jej zniszczenie kończy grę. Ma unikalny wygląd/kolory. Wyświetla pasek zdrowia, gdy jest uszkodzona.
    * **Baza Wroga:** Jest przechodnia. Służy jako punkt startowy dla wrogów. Ma unikalny wygląd/kolory.
    * **Przeszkoda (Skała):** Jest nieprzechodnia. Blokuje budowę wież. Ma prosty wygląd.

## 6. Narzędzia Pomocnicze

System powinien zawierać lub mieć dostęp do następujących narzędzi:

* **EventEmitter:** Implementacja wzorca Publisher-Subscriber do komunikacji między systemami.
* **Snackbar UI:** Komponent do wyświetlania krótkich, tymczasowych powiadomień na ekranie.
* **Pausable Timer:** Mechanizm timera, który można pauzować i wznawiać (przydatne przy utracie focusu przez grę).
* **A\* Pathfinding:** Implementacja algorytmu A* do znajdowania ścieżek na siatce.
* **Stałe Matematyczne:** Dostęp do wartości takich jak 2 * PI.
* **Funkcje Pomocnicze:**
    * Obliczanie kwadratu odległości Euklidesowej między dwoma punktami.
    * Generowanie losowych liczb całkowitych w zadanym zakresie.
    * Generowanie losowego indeksu tablicy.
    * Funkcje `asyncSleep` i `asyncSleepIntervalSecond` uwzględniające pauzowanie przy utracie focusu.
    * Funkcja do tasowania tablicy.
* **Funkcje Rysujące Kształty:** Funkcje pomocnicze do rysowania specyficznych kształtów na canvas (np. zaokrąglony prostokąt, wielokąt foremny).
