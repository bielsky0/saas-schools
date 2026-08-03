# Specyfikacja funkcjonalna

## Topbar edytora oraz panel edycji sekcji (wzorowane na Shopify)

Dokument opisuje docelowe zachowanie górnego paska nawigacyjnego (topbar) edytora stron oraz panelu bocznego służącego do edycji sekcji. Rozwiązanie ma być wzorowane na edytorze motywów Shopify, z dodatkowymi elementami specyficznymi dla naszego produktu (zakładka SEO).

---

## 1. Topbar edytora

Górny pasek nawigacyjny podzielony jest na trzy strefy: lewą (nawigacja i tryby edycji), środkową (wybór strony do edycji) oraz prawą (akcje globalne: zapis, publikacja, historia, asystent AI).

![Układ topbaru wzorowany na Shopify](Zrzut_ekranu_2026-08-3_o_17_36_03.png)

*Zrzut 1 — układ topbaru wzorowany na Shopify (stan obecny/referencyjny).*

### 1.1 Lewa strona topbaru

Od lewej do prawej znajdują się kolejno:

1. **Ikona wyjścia / powrotu do dashboardu** — strzałka skierowana w lewo. Kliknięcie przenosi użytkownika poza edytor, z powrotem do panelu administracyjnego (dashboardu sklepu/aplikacji).
2. **Ikona „Sekcje”** — przełącza lewy panel boczny w tryb listy sekcji strony (drzewo sekcji/bloków, patrz punkt 1.1.1).
3. **Ikona „Ustawienia szablonu”** (koło zębate) — przełącza lewy panel w tryb ustawień całego szablonu strony (globalne ustawienia layoutu, motywu, itp.). Ma skrót klawiszowy ⌘⇧2 (Cmd+Shift+2).
4. **Ikona „SEO”** — element, którego nie ma w standardowym edytorze Shopify, dodawany na potrzeby naszego produktu. Przełącza lewy panel w tryb zarządzania SEO danej strony (tytuł meta, opis meta, adres URL, podgląd wyniku w wyszukiwarce itp.).

![Grupa trzech ikon trybu](Zrzut_ekranu_2026-08-3_o_17_36_53.png)

*Zrzut 2 — grupa trzech ikon trybu (sekcje / ustawienia szablonu / SEO) po lewej stronie topbaru.*

#### 1.1.1 Zasada działania przełącznika trybów

Trzy ikony (Sekcje, Ustawienia szablonu, SEO) działają jak zakładki — w danym momencie aktywna jest tylko jedna z nich, co jest sygnalizowane wizualnie (podświetlenie/tło aktywnej ikony).

- Kliknięcie ikony **„Sekcje”** → w lewym panelu bocznym pojawia się hierarchiczna lista sekcji i bloków bieżącej strony (drzewo), umożliwiająca ich dodawanie, przenoszenie, ukrywanie i usuwanie.
- Kliknięcie ikony **„Ustawienia szablonu”** → w lewym panelu bocznym pojawiają się ustawienia dotyczące całego szablonu (np. wybór layoutu, ustawienia globalne strony), niezależne od pojedynczej sekcji.
- Kliknięcie ikony **„SEO”** → w lewym panelu bocznym pojawia się formularz do zarządzania metadanymi SEO bieżącej strony.

![Tooltip ustawień szablonu](Zrzut_ekranu_2026-08-3_o_17_36_53.png)

*Zrzut 3 — podpowiedź (tooltip) po najechaniu na ikonę ustawień szablonu, ze skrótem klawiszowym.*

### 1.2 Środkowa część topbaru — wybór strony

Na środku topbaru znajduje się pole wyboru (select/dropdown) prezentujące aktualnie edytowaną stronę, np. „Strona główna”, wraz ze strzałką rozwijania w dół.

5. Kliknięcie w pole rozwija listę dostępną do wyboru, zawierającą wszystkie strony i podstrony dostępne do edycji, pogrupowane kategoriami, np.: Strona główna, Produkty, Kolekcje, Lista kolekcji, Karta prezentowa, Koszyk, Kasa i konta klientów, Strony, Blogi, Posty na blogu, Wyszukiwanie, Hasło.
6. Wybranie pozycji z listy przełącza kontekst edytora na wybraną stronę/szablon — treść lewego panelu (drzewo sekcji) oraz podgląd na środku ekranu aktualizują się zgodnie z wybraną stroną.
7. Na górze listy rozwijanej znajduje się pole wyszukiwania („Przeszukaj sklep online”), umożliwiające szybkie odnalezienie konkretnej strony po nazwie — w miarę wpisywania tekstu lista wyników zawęża się.
8. Obok pola wyszukiwania dodany zostaje przycisk **„+”** do dodawania nowej strony. Kliknięcie go otwiera modal (okno dialogowe) z formularzem tworzenia nowej strony (np. wybór typu strony, tytuł, adres URL). Funkcjonalność ta nie występuje w standardowym Shopify i jest elementem dodawanym przez nas.

![Rozwinięta lista wyboru stron](Zrzut_ekranu_2026-08-3_o_17_36_19.png)

*Zrzut 4 — rozwinięta lista wyboru stron wraz z polem wyszukiwania (docelowo: + przycisk dodawania strony obok wyszukiwarki).*

### 1.3 Prawa strona topbaru

Po prawej stronie topbara znajdują się przyciski akcji globalnych, od lewej do prawej:

9. **Asystent AI** — otwiera panel/czat asystenta AI wspomagającego edycję strony.
10. **Tryb podglądu / wybór urządzenia** (np. widok mobilny) — przełącza podgląd strony między wariantami (desktop/mobile).
11. **Cofnij / Ponów** (undo/redo) — strzałki umożliwiające cofanie i ponawianie ostatnich zmian w edytorze.
12. **Menu dodatkowe** („...") — pozostałe akcje kontekstowe.
13. **Przycisk „Zapisz”** — zapisuje bieżące zmiany bez publikowania ich na żywo, z rozwijanym menu dodatkowych opcji zapisu.
14. **Wskaźnik statusu strony** (np. „Aktywny") oraz przycisk publikacji zmian na żywo.

> **Uwaga:** dokładna kolejność i nazewnictwo powyższych elementów do potwierdzenia z zespołem projektowym na podstawie referencyjnego zrzutu 1 — powyższy opis odwzorowuje elementy widoczne na zrzucie ekranu (ikona uśmiechniętej buźki/AI, ikona zaznaczania/urządzenia, ikona telefonu, strzałki cofnij/ponów, „...", „Zapisz" z rozwijaną strzałką).

---

## 2. Panel edycji sekcji — usprawnienie UX

**Obecny stan:** po kliknięciu w konkretną sekcję strony w celu jej edycji, panel boczny wysuwający się z dołu ekranu pojawia się zbyt nisko — użytkownik widzi tylko fragment interfejsu i musi przewijać, aby zobaczyć kontekst (sąsiednie sekcje w drzewie) oraz pełne ustawienia edytowanego elementu.

![Aktualny widok panelu edycji](Zrzut_ekranu_2026-08-3_o_17_49_14.png)

*Zrzut 5 — aktualny widok panelu edycji (stan obecny, do poprawy).*

### 2.1 Docelowe zachowanie

15. Po kliknięciu w daną sekcję na liście/drzewie w celu jej edycji, widok drzewa hierarchii sekcji automatycznie przewija się (scroll) tak, aby wybrana sekcja była widoczna.
16. Panel edycji ustawień tej sekcji pojawia się na wysokości pozwalającej zobaczyć maksymalnie **3 elementy drzewa** jednocześnie: element wybrany do edycji znajduje się **pośrodku**, a po jednym elemencie widoczne jest nad i pod nim (element poprzedni i następny w hierarchii).
17. Innymi słowy: pozycja pionowa panelu edycji nie jest stała u dołu ekranu, lecz dynamicznie ustawiana względem pozycji wybranego elementu w drzewie, tak by kontekst (sąsiednie sekcje) był zawsze widoczny, a panel nie zasłaniał nadmiernej części ekranu.

![Docelowy sposób pozycjonowania panelu](Zrzut_ekranu_2026-08-3_o_17_36_40.png)

*Zrzut 6 — docelowy sposób pozycjonowania panelu: wybrana sekcja widoczna jako środkowy z trzech elementów drzewa.*

### 2.2 Elementy do usunięcia z panelu edycji sekcji

W panelu bocznym otwieranym przy edycji konkretnej sekcji (widok „Sekcje" z lewej strony topbaru, patrz zrzut 6) należy usunąć następujące elementy, ponieważ ich funkcje zostają przeniesione do topbaru lub nie mają zastosowania w tym kontekście:

- Pole wyszukiwania bloków („Szukaj bloków...").
- Przycisk „Wygeneruj sekcję z opisu".
- Przycisk „+" do dodawania nowych stron — funkcjonalność dodawania stron przenosimy w całości do topbaru (patrz punkt 1.2, pkt 4: przycisk „+" obok wyszukiwarki stron w środkowej części topbaru).

![Zakładki Sekcje / Motyw / Strony](Zrzut_ekranu_2026-08-3_o_17_36_53.png)

*Zrzut 7 — zakładki „Sekcje / Motyw / Strony" z polem wyszukiwania i przyciskiem generowania sekcji — elementy wskazane do usunięcia z tego widoku.*

---

## 3. Podsumowanie zmian

| Obszar | Zmiana |
|---|---|
| Topbar — lewa strona | Dodanie trzeciej ikony (SEO) obok Sekcji i Ustawień szablonu, z osobnym trybem panelu bocznego. |
| Topbar — środek | Dodanie przycisku „+" obok wyszukiwarki stron, otwierającego modal tworzenia nowej strony. |
| Panel edycji sekcji — pozycjonowanie | Panel wysuwa się wyżej: widoczne max. 3 elementy drzewa, edytowany element pośrodku, drzewo scrollowane do wybranego elementu. |
| Panel edycji sekcji — elementy do usunięcia | Usunięcie: wyszukiwarki bloków, przycisku generowania sekcji z opisu, przycisku dodawania stron (przeniesionego do topbaru). |