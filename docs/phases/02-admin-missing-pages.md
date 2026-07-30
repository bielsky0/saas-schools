# Faza 2: Admin panel — brakujące strony

## Cel

Uzupełnienie brakujących lub stubowych stron w panelu administracyjnym (`/dashboard/`) zgodnie z wireframe'ami.

## Stan obecny

| Strona | Status | Problem |
|--------|--------|---------|
| `/dashboard/clients/` | ❌ Brak root page | Tylko `[clientId]/` (price override) istnieje. Nie ma listy rodziców. |
| `/dashboard/extra-fees/` | ⚠️ Stub read-only | Tylko tabela odczytu, bez formularzy tworzenia/edycji |
| `/dashboard/qualification-cards/` | ⚠️ Stub | Wyświetla surowe ID zamiast nazw, brak filtrowania, brak akcji |
| `/dashboard/` (AcademyHome) | ⚠️ Tylko buttony | Brak kart statystyk, nadchodzących zajęć, aktywności |

---

## 2a. Lista rodziców/klientów (`/dashboard/clients/`)

### Backend (już istnieje)
- `listClients()` w `src/features/clients/data.ts`
- `client` tabela z polami: id, email, firstName, lastName, phone, organizationId, createdAt
- `athlete` tabela (dzieci przypisane do client)
- `booking` — aktywne rezerwacje klienta

### Zakres frontendu

**Lista klientów (tabela):**
- Kolumny: Imię i nazwisko, Email, Telefon, Liczba dzieci (athletes), Aktywne rezerwacje, Data dodania
- Sortowanie po kolumnach (imię, data dodania)
- Wyszukiwarka (po imieniu, nazwisku, emailu) — filtr client-side lub query param
- Paginacja (użyć istniejącego `pagination.ts`)
- Link do szczegółów: kliknięcie w wiersz → `/dashboard/clients/[clientId]`
- Stan pusty: "Brak klientów. Klienci są dodawani automatycznie przy pierwszym zapisie na zajęcia."

**Szczegóły klienta (`/dashboard/clients/[clientId]/`):**
- Rozbudowa istniejącej strony (obecnie tylko price override)
- Dodanie sekcji:
  - Dane klienta (imię, nazwisko, email, telefon)
  - Lista dzieci (athletes): imię, wiek, aktywne rezerwacje
  - Aktywne rezerwacje
  - Historia kredytów
  - Price overrides (już istnieje)

### Komponenty shadcn/ui
- `Table` (już istnieje), `Badge` (już istnieje), `Input` (już istnieje dla wyszukiwarki)
- `Avatar` (z Fazy 0) — awatar klienta (inicjały)
- `Skeleton` (z Fazy 0) — loading

### DoD
- [ ] Strona `/dashboard/clients/` renderuje listę klientów z paginacją
- [ ] Wyszukiwarka filtruje po imieniu, nazwisku, emailu
- [ ] Kliknięcie w wiersz przenosi do `/dashboard/clients/[clientId]`
- [ ] Strona szczegółów pokazuje dzieci, rezerwacje, historię kredytów
- [ ] Wszystkie zapytania są owner-scoped (RLS)
- [ ] Empty state dla braku klientów
- [ ] Loading skeleton podczas ładowania

### Testy
- [ ] E2E: Admin widzi listę klientów, klika w klienta → szczegóły
- [ ] E2E: Wyszukiwarka filtruje listę
- [ ] E2E: Paginacja działa
- [ ] E2E: Trener NIE widzi `/dashboard/clients/` (brak dostępu)
- [ ] Unit: `listClients()` zwraca tylko klientów z tej organizacji

---

## 2b. Opłaty dodatkowe — CRUD (`/dashboard/extra-fees/`)

### Backend (już istnieje)
- `extraFee` tabela: id, organizationId, description, amount, status, paymentMethod, clientId?, athleteId?, createdAt
- `src/features/extra-fees/actions.ts` — server actions
- `src/features/extra-fees/data.ts` — `listExtraFees()`
- Guard: `requireOrgPermission("extra_fees.manage")`

### Zakres frontendu

**Rozbudowa strony z read-only do pełnego CRUD:**
- Formularz tworzenia (Card z formularzem):
  - Wybór klienta (Select/Dropdown z `listClients()`)
  - Wybór dziecka (opcjonalnie, filtrowany po kliencie)
  - Opis opłaty (Input)
  - Kwota (Input number, w groszach)
  - Metoda płatności (Select: cash, card, transfer)
- Tabela (już istnieje) + przycisk edycji dla każdego wiersza
- Możliwość anulowania/oznaczenia jako opłacone (zmiana statusu)
- Filtrowanie po statusie: wszystkie / opłacone / oczekujące / anulowane

### Komponenty shadcn/ui
- `Card` (już istnieje), `Dialog` (już istnieje) do formularza w modalu
- `Select` (już istnieje), `Badge` (już istnieje)
- `Tabs` (z Fazy 0) — filtrowanie po statusie

### DoD
- [ ] Formularz tworzenia nowej opłaty
- [ ] Edycja istniejącej opłaty (opis, kwota)
- [ ] Zmiana statusu (pending → paid, pending → cancelled)
- [ ] Filtrowanie po statusie (Tabs)
- [ ] Walidacja: kwota > 0, opis wymagany
- [ ] Toast/Sonner po zapisaniu (już istnieje Sonner)

### Testy
- [ ] E2E: Admin tworzy nową opłatę → pojawia się w tabeli
- [ ] E2E: Admin oznacza opłatę jako opłaconą → zmiana statusu
- [ ] E2E: Filtry po statusie działają
- [ ] Unit: `createExtraFee` waliduje dane wejściowe

---

## 2c. Karty kwalifikacyjne — rozbudowa (`/dashboard/qualification-cards/`)

### Backend (już istnieje)
- `qualification_card` tabela: id, organizationId, athleteId, groupTypeId, status, ...
- `src/features/qualification-cards/data.ts` — `listQualificationCards()`
- Guard: `requireOrgPermission("qualification_cards.manage")`

### Zakres frontendu

**Rozbudowa stubu:**
- Rozwiązanie surowych ID:
  - `athleteId` → imię i nazwisko dziecka
  - `groupTypeId` → nazwa grupy/obozu
- Kolumny: Dziecko, Grupa/Obóz, Status (badge), Data utworzenia, Data ostatniej modyfikacji
- Filtrowanie po statusie (wszystkie / parent_completed / leader_completed / pending)
- Wyszukiwarka po nazwisku dziecka
- Link do podglądu karty (PDF?)

### Komponenty shadcn/ui
- `Badge` (już istnieje), `Tabs` (z Fazy 0)
- `Skeleton` (z Fazy 0)

### DoD
- [ ] Tabela pokazuje nazwy zamiast surowych ID
- [ ] Filtrowanie po statusie (Tabs)
- [ ] Wyszukiwarka po nazwisku dziecka
- [ ] Loading skeleton

### Testy
- [ ] E2E: Tabela ładuje się z rozwiązanymi nazwami
- [ ] E2E: Filtry po statusie

---

## 2d. Dashboard home — karty statystyk

### Backend (już istnieje)
- `listUpcomingSessions()` — nadchodzące sesje
- `listClients()` — liczba klientów
- `listBookings()` — rezerwacje
- Audit log — ostatnia aktywność

### Zakres frontendu

**Zastąpienie obecnych buttonów w `academy-home.tsx` siatką kart:**
- Karta 1: **Nadchodzące zajęcia** — najbliższe 5 sesji z datą, grupą, trenerem, liczbą zapisanych
- Karta 2: **Szybkie statystyki** — liczba aktywnych klientów, liczba grup, liczba trenerów
- Karta 3: **Ostatnia aktywność** — ostatnie 5 wpisów z audytu (kto, co, kiedy)
- Karta 4: **Pending do akceptacji** — wnioski urlopowe (Faza 4), wnioski o zmianę grupy, wnioski o lekcje ind. (Faza 5) — licznik z badge

### Komponenty shadcn/ui
- `Card` (już istnieje), `Badge` (już istnieje), `Skeleton` (z Fazy 0)

### DoD
- [ ] Dashboard pokazuje 4 karty z danymi na żywo
- [ ] Karta "Nadchodzące zajęcia" aktualizuje się po zmianach
- [ ] Karta "Statystyki" pokazuje realne liczby
- [ ] Pusta sekcja pokazuje odpowiedni empty state
- [ ] Loading skeleton podczas ładowania

### Testy
- [ ] E2E: Dashboard ładuje karty z danymi
- [ ] E2E: Liczby w statystykach zgadzają się z rzeczywistością
- [ ] Unit: Komponent karty statystyk renderuje poprawne wartości

---

## Zależności

- **Faza 0** — komponenty shadcn/ui (Avatar, Skeleton, Tabs)
- **Faza 1** — sidebar do nawigacji (opcjonalnie, strony działają też bez)

## Pliki do utworzenia / zmiany

| Plik | Akcja |
|------|-------|
| `src/app/[locale]/(app)/dashboard/clients/page.tsx` | **Nowy** — root page z listą |
| `src/app/[locale]/(app)/dashboard/clients/client-list.tsx` | **Nowy** — tabela klientów |
| `src/app/[locale]/(app)/dashboard/clients/[clientId]/page.tsx` | **Zmiana** — rozbudowa o sekcje |
| `src/app/[locale]/(app)/dashboard/extra-fees/page.tsx` | **Zmiana** — dodanie formularzy |
| `src/app/[locale]/(app)/dashboard/extra-fees/extra-fee-form.tsx` | **Nowy** — formularz |
| `src/app/[locale]/(app)/dashboard/qualification-cards/page.tsx` | **Zmiana** — rozbudowa |
| `src/app/[locale]/(app)/dashboard/academy-home.tsx` | **Zmiana** — karty zamiast buttonów |
| `src/app/[locale]/(app)/dashboard/dashboard-cards.tsx` | **Nowy** — komponent kart |
| `messages/pl.json` | Nowe klucze |
| `messages/en.json` | Nowe klucze |

## Szacowany nakład

3–4 dni — cztery podstrony, każda z własnym zestawem testów.
