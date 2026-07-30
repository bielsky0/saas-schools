# Faza 7: Dashboard home redesign + polish

## Cel

Przeprojektowanie dashboard home dla wszystkich ról, dodanie kalendarza w harmonogramie, poprawki wizualne i mobile QA we wszystkich widokach zbudowanych w Fazach 1–6.

## Stan obecny

- Dashboard admina: tylko przyciski (`academy-home.tsx`)
- Dashboard trenera: jeszcze nie istnieje (→ Faza 3)
- Harmonogram: lista sesji, brak widoku kalendarza
- Zarobki trenera: istnieją, ale bez caveat o brakujących stawkach
- Brak kompleksowego QA mobile dla nowych widoków

---

## 7a. Dashboard home — karty per rola

Wspólny layout dashboardu z siatką kart (2 kolumny na desktop, 1 na mobile).

### Admin / Owner

| Karta | Zawartość | Źródło danych |
|-------|-----------|---------------|
| **Nadchodzące zajęcia (dziś + jutro)** | Lista 5 najbliższych sesji: godzina, grupa, trener, zapisani/max. Link do harmonogramu. | `listUpcomingSessions()` |
| **Szybkie statystyki** | 4 liczby w gridzie 2×2: aktywni klienci, grupy, trenerzy, dzisiejsze sesje. Każda z ikoną i kolorem. | `listClients().length`, `listGroupTypes().length`, `listTrainers().length` |
| **Pending do akceptacji** | Liczniki z badge: wnioski urlopowe (→ F4), wnioski o zmianę grupy, wnioski o lekcje ind. (→ F5). Kliknięcie → przekierowanie do odpowiedniej strony. Jeśli 0 → "Wszystko ogarnięte ✓" | Count queries per tabela |
| **Ostatnia aktywność** | 5 ostatnich wpisów z audytu: kto, akcja, target, kiedy (relatywny czas: "5 min temu"). Link do pełnego audytu. | `listOrgAuditEntries(limit=5)` |
| **Szybkie akcje** | Buttony: Dodaj typ zajęć, Dodaj trenera, Zaproś członka | — |

### Trener

| Karta | Zawartość | Źródło danych |
|-------|-----------|---------------|
| **Dzień dobry, [Imię]** | Powitanie, data, rola. Awatar trenera. | `session.user` |
| **Dzisiejsze zajęcia** | Karty sesji: godzina, grupa, lokalizacja, liczba uczestników. Przycisk "Lista obecności". | `listUpcomingSessions({trainerId, date: today})` |
| **Nadchodzące (7 dni)** | Mini-tabela: data, godzina, grupa, uczestnicy | `listUpcomingSessions({trainerId, days: 7})` |
| **Szybkie akcje** | Moja dostępność, Wniosek urlopowy, Zarobki | — |

### Reception / Secretariat

| Karta | Zawartość |
|-------|-----------|
| **Szybkie akcje** | Potwierdź płatność gotówką, Sprzedaj pakiet, Lista klientów |
| **Dzisiejsze zajęcia** | Wszystkie dzisiejsze sesje (bez filtru trainerId) |

### Komponenty
- `Card` (już istnieje) — kontener każdej karty
- `Skeleton` (z Fazy 0) — loading każdej karty
- `Badge` (już istnieje) — liczniki pending
- `Avatar` (z Fazy 0) — awatar trenera
- `Button` (już istnieje) — szybkie akcje

### DoD
- [ ] Admin widzi 5 kart na dashboardzie z danymi na żywo
- [ ] Trener widzi spersonalizowany dashboard
- [ ] Liczniki pending aktualizują się po zmianach
- [ ] Karty ładują się asynchronicznie (każda z własnym Suspense/Skeleton)
- [ ] Puste stany: "Brak nadchodzących zajęć", "Wszystko ogarnięte ✓"

---

## 7b. Harmonogram — widok kalendarza

### Obecnie
`/dashboard/schedule/` — tabela sesji z filtrem lokalizacji.

### Do zrobienia
**Toggle: Lista / Kalendarz** (Tabs u góry):
- Widok **Lista** (obecny) — zostaje bez zmian
- Widok **Kalendarz** (nowy):
  - Pełnoekranowy kalendarz miesięczny (komponent `Calendar`)
  - Dni z sesjami oznaczone kropką/badge (jak GitHub contributions)
  - Kliknięcie w dzień → lista sesji w panelu bocznym / poniżej kalendarza
  - Kolorowanie: zielony = są miejsca, żółty = prawie pełny, czerwony = pełny
  - Wyróżnienie dni z urlopem trenera (szare tło — Faza 4)
  - Wyróżnienie sesji bez trenera (czerwony badge)

### Integracja z urlopami (Faza 4)
- Dni urlopu trenera: szare tło w kalendarzu z tooltip "Urlop: [Imię Trenera]"
- Sesje w dniu urlopu: badge "Zastępstwo: [Trener]" lub "Brak trenera!"

### Komponenty
- `Calendar` (z Fazy 0) — widok kalendarza
- `Tabs` (z Fazy 0) — przełącznik lista/kalendarz
- `Badge` (już istnieje) — statusy sesji

### DoD
- [ ] Przełącznik Lista/Kalendarz na górze strony harmonogramu
- [ ] Kalendarz pokazuje dni z sesjami
- [ ] Kliknięcie w dzień → lista sesji
- [ ] Kolorowanie dostępności
- [ ] Integracja z urlopami (gdy Faza 4 gotowa)

---

## 7c. Zarobki trenera — caveat o brakujących stawkach

### Obecnie
`/dashboard/trainers/earnings/` — `EarningsReportClient` pokazuje zarobki.

### Do zrobienia
- **Alert/Callout** na górze strony (tylko dla admina/ownera), gdy któryś trener nie ma ustawionej stawki:
  > "Uwaga: niektórzy trenerzy nie mają ustawionych stawek. Zarobki mogą być niepełne. [Ustaw stawki]"
  - Link do `/dashboard/trainers/rates/`
- **Dla trenera** (self-view): jeśli nie ma stawki → komunikat:
  > "Twoja stawka nie została jeszcze ustawiona. Skontaktuj się z administratorem."
- **Wiersz w tabeli:** przy trenerze bez stawki — ikona ostrzeżenia z tooltipem

### DoD
- [ ] Admin widzi alert o brakujących stawkach (jeśli dotyczy)
- [ ] Trener widzi komunikat o braku stawki
- [ ] Tabela zarobków oznacza trenerów bez stawek

---

## 7d. Mobile responsive QA

Przegląd wszystkich widoków zbudowanych w Fazach 1–6 na breakpointach mobilnych.

### Checklist per widok

| Widok | Mobile (<768px) | Tablet (768–1024px) |
|-------|-----------------|---------------------|
| Sidebar (F1) | Hamburger + Sheet ✓ | Sidebar zwężony |
| Dashboard home (F2d) | Karty 1 kolumna | Karty 2 kolumny |
| Lista klientów (F2a) | Karty zamiast tabeli | Tabela z poziomym scroll |
| Extra fees (F2b) | Formularz full-width | Formularz w karcie |
| Karty kwalifikacyjne (F2c) | Uproszczona tabela | Pełna tabela |
| Trainer dashboard (F3a) | Karty 1 kolumna | 2 kolumny |
| Moje zajęcia (F3b) | Accordion zamiast tabeli | Tabela + Accordion |
| Wnioski urlopowe (F4) | DatePicker w modalu full-screen | Modal |
| Zamów lekcję (F5) | Kroki 1 na raz | Wszystkie widoczne |
| Panel admina wnioski (F5) | Karty zamiast tabeli | Tabela |
| Ustawienia klienta (F6) | Sekcje 1 kolumna | 2 kolumny |

### DoD
- [ ] Wszystkie strony działają na 375px szerokości (iPhone SE)
- [ ] Nie ma poziomego scrolla (poza tabelami z dużą ilością kolumn)
- [ ] Przyciski akcji mają min. 44px wysokości (touch target)
- [ ] Modale są full-screen na mobile
- [ ] Date picker nie wychodzi poza ekran
- [ ] Sidebar Sheet zamyka się po wyborze linku

---

## 7e. Ogólne poprawki

- [ ] **Loading skeletons:** każda strona z async data ma Skeleton zamiast pustego ekranu
- [ ] **Error boundaries:** strony mają error.tsx z przyciskiem "Spróbuj ponownie"
- [ ] **Empty states:** każda lista/tabela ma sensowny empty state z ikoną i tekstem
- [ ] **Toast notifications:** akcje CRUD pokazują Sonner toast (już skonfigurowany)
- [ ] **i18n:** wszystkie nowe teksty w `messages/pl.json` i `messages/en.json`
- [ ] **Dark mode:** wszystkie nowe komponenty wyglądają dobrze w dark mode
- [ ] **Accessibility:** przyciski mają aria-label, tabele mają caption, formularze mają label

---

## Testy

### E2E (Playwright) — pełen przegląd
- [ ] Admin: dashboard ładuje wszystkie karty
- [ ] Admin: kalendarz w harmonogramie działa
- [ ] Trener: dashboard pokazuje tylko własne sesje
- [ ] Mobile: hamburger → Sheet → nawigacja działa
- [ ] Mobile: wszystkie strony bez poziomego scrolla
- [ ] Dark mode: przełącznik działa, wszystkie strony czytelne

### Visual regression (opcjonalnie)
- [ ] Screenshoty dashboardu per rola
- [ ] Screenshoty mobile per kluczowa strona

### Manualne QA
- [ ] Przejście całego flow: admin → trener → klient na mobile
- [ ] Test na rzeczywistym urządzeniu (iPhone, Android)
- [ ] Test na różnych przeglądarkach (Chrome, Safari, Firefox)

---

## Zależności

- **Fazy 0–6** — wszystkie poprzednie fazy muszą być ukończone

## Pliki do zmiany / utworzenia

| Plik | Akcja |
|------|-------|
| `src/app/[locale]/(app)/dashboard/page.tsx` | **Zmiana** — dashboard z kartami |
| `src/app/[locale]/(app)/dashboard/academy-home.tsx` | **Zmiana** — redesign na karty |
| `src/components/dashboard/admin-cards.tsx` | **Nowy** — karty admina |
| `src/components/dashboard/trainer-cards.tsx` | **Nowy** — karty trenera |
| `src/components/dashboard/reception-cards.tsx` | **Nowy** — karty recepcji |
| `src/app/[locale]/(app)/dashboard/schedule/page.tsx` | **Zmiana** — toggle kalendarza |
| `src/app/[locale]/(app)/dashboard/schedule/calendar-view.tsx` | **Nowy** — widok kalendarza |
| `src/app/[locale]/(app)/dashboard/trainers/earnings/page.tsx` | **Zmiana** — alert o stawkach |
| Wszystkie `page.tsx` z Faz 1–6 | **Zmiana** — loading skeletons, empty states, error boundaries |
| `messages/pl.json` | Nowe klucze |
| `messages/en.json` | Nowe klucze |

## Szacowany nakład

3–4 dni — redesign dashboardu, kalendarz, mobile QA, poprawki wizualne we wszystkich widokach.
