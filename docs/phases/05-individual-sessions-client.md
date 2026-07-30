# Faza 5: Zajęcia indywidualne — flow klienta

## Cel

Zbudowanie flow zamawiania lekcji indywidualnych przez klienta (rodzica) oraz panelu obsługi wniosków dla admina i trenera.

## Stan obecny

### Co już istnieje (backend)
- ✅ `slot_first` engine w `group_type` — tworzy sesję + booking w jednej transakcji
- ✅ `createSlotFirstBookingAction()` w `src/features/bookings/slot-first.ts`
- ✅ `trainer_availability` — okna dostępności trenerów
- ✅ `computeAvailabilitySlots()` — wyliczanie wolnych slotów
- ✅ `eligibleTrainerIds` na `group_type` — którzy trenerzy mogą prowadzić
- ✅ `client_price_override` — indywidualne ceny

### Czego brakuje
- ❌ Encja "wniosku/zapytania" od klienta — nie ma gdzie zapisać "chcę lekcję indywidualną z trenerem X w terminie Y"
- ❌ Strona klienta do zamawiania lekcji
- ❌ Panel admina do obsługi wniosków (przypisz trenera → ustal cenę → potwierdź)
- ❌ Widok trenera dla wniosków skierowanych do niego

---

## Backend do zbudowania

### Nowa tabela: `individual_session_request`

```sql
CREATE TABLE individual_session_request (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  organizationId        TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  clientId              TEXT NOT NULL,             -- rodzic składający wniosek
  athleteId             TEXT NOT NULL,             -- dla którego dziecka
  preferredTrainerId    TEXT REFERENCES "user"(id), -- preferowany trener (nullable)
  preferredDate         DATE,                      -- preferowana data (nullable)
  preferredTimeOfDay    TEXT,                      -- morning / afternoon / evening / any
  goalDescription       TEXT,                      -- opis celu / oczekiwań
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','assigned','confirmed','rejected','cancelled')),
  assignedTrainerId     TEXT REFERENCES "user"(id), -- trener przypisany przez admina
  assignedPrice         INTEGER,                    -- cena ustalona przez admina (w groszach)
  assignedDate          DATE,                       -- data sesji
  assignedStartTime     TIME,                       -- godzina rozpoczęcia
  assignedEndTime       TIME,                       -- godzina zakończenia
  assignedSessionId     TEXT,                       -- ID sesji slot_first (po potwierdzeniu)
  adminNotes            TEXT,                       -- notatki admina
  rejectionReason       TEXT,
  createdAt             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Kompozytowe FKi dla tenant isolation
  CONSTRAINT isr_client_fk FOREIGN KEY (clientId, organizationId)
    REFERENCES client(id, organizationId) ON DELETE CASCADE,
  CONSTRAINT isr_athlete_fk FOREIGN KEY (athleteId, organizationId)
    REFERENCES athlete(id, organizationId) ON DELETE CASCADE,
  CONSTRAINT isr_trainer_fk FOREIGN KEY (assignedTrainerId)
    REFERENCES "user"(id),
  CONSTRAINT isr_session_fk FOREIGN KEY (assignedSessionId, organizationId)
    REFERENCES class_session(id, organizationId) ON DELETE SET NULL,

  UNIQUE(id, organizationId)
);

CREATE INDEX isr_org_status_idx ON individual_session_request(organizationId, status);
CREATE INDEX isr_trainer_idx ON individual_session_request(assignedTrainerId) WHERE assignedTrainerId IS NOT NULL;
```

### Nowe funkcje backendowe

**`src/features/bookings/individual-request-actions.ts`:**

- `submitIndividualRequest(data)` — klient składa wniosek
  - Guard: `resolveClientSession()` — klient musi być zalogowany
  - Walidacja: dziecko należy do tego klienta, preferowany trener jest w `eligibleTrainerIds` grupy
  - Status początkowy: `pending`

- `assignTrainer(requestId, trainerId, price?, date?, startTime?)` — admin przypisuje trenera
  - Guard: `requireOrgPermission("group_types.manage")` — admin/owner
  - Zmiana statusu: `pending` → `assigned`
  - Walidacja: trener aktywny, w `eligibleTrainerIds`, ma dostępność w danym terminie
  - Cena: jeśli nie podana → domyślnie z `group_type.price`, można override

- `confirmRequest(requestId)` — admin potwierdza → tworzy sesję `slot_first` + booking
  - Guard: `requireOrgPermission("sessions.manage")`
  - Wywołuje wewnętrznie `createSlotFirstBookingAction()` z przypisanymi parametrami
  - Status: `assigned` → `confirmed`
  - Zapisuje `assignedSessionId` utworzonej sesji
  - Jeśli `slot_first` się nie powiedzie (konflikt trenera) → rzuca błędem, wnioskodawca dostaje info

- `rejectRequest(requestId, reason)` — admin odrzuca
  - Guard: `requireOrgPermission("group_types.manage")`
  - Wymagany powód
  - Status: `pending` lub `assigned` → `rejected`

- `cancelRequest(requestId)` — klient anuluje
  - Guard: `resolveClientSession()` + własność wniosku
  - Status: `pending` lub `assigned` → `cancelled`

**`src/features/bookings/individual-request-data.ts`:**
- `listIndividualRequests(filters)` — z filtrami: status, trainerId, clientId
- `getIndividualRequest(id)` — szczegóły z relacjami (client, athlete, trainer, session)
- `listPendingForTrainer(trainerId)` — wnioski przypisane do trenera

### Walidacja

**`src/features/bookings/individual-request-schema.ts`:**
```ts
export const submitIndividualRequestSchema = z.object({
  athleteId: z.string().uuid(),
  groupTypeId: z.string().uuid(),
  preferredTrainerId: z.string().uuid().optional(),
  preferredDate: z.coerce.date().optional(),
  preferredTimeOfDay: z.enum(['morning','afternoon','evening','any']).optional(),
  goalDescription: z.string().max(500).optional(),
});

export const assignTrainerSchema = z.object({
  requestId: z.string().uuid(),
  trainerId: z.string().uuid(),
  price: z.number().int().positive().optional(),
  date: z.coerce.date().optional(),
  startTime: z.string().optional(), // format HH:mm
});
```

---

## Frontend do zbudowania

### 5a. Strona klienta: Zamów lekcję indywidualną (`/zamow-lekcje-indywidualna` lub `/zapisy/[slug]/indywidualna`)

Dostępna z poziomu publicznej strony akademii `(site)`.

**Flow krok po kroku:**

1. **Wybór typu zajęć (group_type `slot_first`)**
   - Lista dostępnych typów zajęć indywidualnych (engine = `slot_first`)
   - Karta: nazwa, opis, cena, dostępni trenerzy

2. **Wybór dziecka**
   - Dropdown/Select z listą dzieci klienta (`listAthletes()`)
   - Jeśli klient nie ma dzieci → komunikat "Dodaj dziecko w panelu"

3. **Wybór preferencji**
   - Preferowany trener (Select z `eligibleTrainerIds`, opcjonalnie)
   - Preferowana data (DatePicker, opcjonalnie)
   - Preferowana pora dnia (RadioGroup: rano / popołudnie / wieczór / dowolna)
   - Opis celu/oczekiwań (Textarea, opcjonalnie)

4. **Podsumowanie i wysłanie**
   - Podgląd wszystkich wyborów
   - Przycisk "Wyślij zapytanie"
   - Toast/Sonner: "Wniosek został wysłany. Skontaktujemy się z Tobą."

5. **Strona potwierdzenia**
   - "Dziękujemy! Twoje zapytanie zostało przyjęte."
   - "Administrator akademii skontaktuje się z Tobą w ciągu 24h."
   - Link powrotu do `/moje-zajecia`

### 5b. Panel admina: Wnioski o lekcje indywidualne (`/dashboard/individual-requests/`)

**Lista wniosków:**
- Tabs: "Nowe" (pending), "Przypisane" (assigned), "Zrealizowane" (confirmed), "Odrzucone" (rejected)
- Tabela: Klient, Dziecko, Cel (skrócony), Preferencje, Status (badge), Data zgłoszenia
- Badge z liczbą pending wniosków w sidebarze

**Modal obsługi wniosku:**
- Pełne dane wniosku
- Sekcja "Przypisz trenera":
  - Dropdown aktywnych trenerów (przefiltrowany po `eligibleTrainerIds`)
  - Wybór daty (date picker)
  - Wybór godziny (time picker lub select z dostępnych slotów)
  - Sugerowana cena (z `group_type.price`) z możliwością override
  - Przycisk "Przypisz" → status `assigned`
- Sekcja "Potwierdź":
  - Widoczna tylko dla statusu `assigned`
  - Przycisk "Potwierdź i utwórz sesję" → tworzy `slot_first` + booking → status `confirmed`
  - Wyświetla ID utworzonej sesji z linkiem
- Przycisk "Odrzuć" (z wymaganym powodem)

### 5c. Panel trenera: Wnioski do mnie (`/dashboard/individual-requests/` — filtrowane)

- Trener widzi tylko wnioski gdzie `assignedTrainerId = self`
- Tabela jak admina, ale bez przycisków akcji (tylko podgląd)
- Statusy: "Przypisane do Ciebie" (assigned), "Zrealizowane" (confirmed)
- Szczegóły wniosku w modalu (bez możliwości edycji)

### Komponenty shadcn/ui
- `RadioGroup` (z Fazy 0) — wybór pory dnia
- `Calendar` (z Fazy 0) — date picker
- `Tabs` (z Fazy 0) — filtrowanie
- `Badge` (już istnieje)
- `Select` (już istnieje)
- `Dialog` / `Sheet` (już istnieje) — modal
- `Skeleton` (z Fazy 0)

---

## Definition of Done

### Backend
- [ ] Tabela `individual_session_request` z migracją
- [ ] `submitIndividualRequest` — klient może złożyć wniosek
- [ ] `assignTrainer` — admin może przypisać trenera i cenę
- [ ] `confirmRequest` — admin może potwierdzić → tworzy `slot_first` session + booking
- [ ] `rejectRequest` — admin może odrzucić z powodem
- [ ] `cancelRequest` — klient może anulować własny wniosek
- [ ] Walidacja: dziecko należy do klienta, trener w eligible
- [ ] RLS: dane izolowane per organizacja

### Frontend
- [ ] Klient: strona zamawiania lekcji z wieloetapowym formularzem
- [ ] Klient: podgląd i potwierdzenie przed wysłaniem
- [ ] Klient: strona potwierdzenia po wysłaniu
- [ ] Admin: lista wniosków z filtrami po statusie
- [ ] Admin: modal z pełną obsługą (przypisz → potwierdź → sesja)
- [ ] Admin: badge z licznikiem pending w sidebarze
- [ ] Trener: lista wniosków przypisanych do siebie
- [ ] Wszystkie teksty w i18n
- [ ] Loading/empty states

---

## Testy

### Unit (Vitest)
- [ ] `submitIndividualRequest` — walidacja: dziecko należy do klienta
- [ ] `submitIndividualRequest` — trener spoza eligible → błąd
- [ ] `assignTrainer` — przypisanie trenera, ceny, daty
- [ ] `confirmRequest` — tworzy sesję `slot_first` z poprawnymi parametrami
- [ ] `confirmRequest` — konflikt trenera → błąd
- [ ] `rejectRequest` — wymaga powodu
- [ ] `cancelRequest` — tylko własny wniosek klienta

### E2E (Playwright)
- [ ] Klient: przechodzi przez cały flow zamawiania
- [ ] Klient: wniosek pojawia się na liście admina jako pending
- [ ] Admin: przypisuje trenera → status zmienia się na assigned
- [ ] Admin: potwierdza → sesja utworzona, booking dodany
- [ ] Admin: odrzuca → klient widzi powód odrzucenia
- [ ] Trener: widzi tylko wnioski przypisane do siebie
- [ ] RLS: klient z org A nie widzi wniosków z org B

### Manualne QA
- [ ] Formularz klienta działa na mobile
- [ ] Date picker na mobile
- [ ] Powiadomienie email do klienta po potwierdzeniu/odrzuceniu
- [ ] Powiadomienie email do trenera po przypisaniu
- [ ] Edge case: klient bez dzieci
- [ ] Edge case: brak dostępnych trenerów

---

## Zależności

- **Faza 0** — komponenty shadcn/ui (RadioGroup, Calendar, Tabs, Skeleton)
- **Faza 1** — sidebar z nawigacją
- **Faza 3** — panel trenera (widok wniosków do mnie)

## Pliki do utworzenia / zmiany

| Plik | Akcja |
|------|-------|
| `src/lib/db/schema/individual-session-requests.ts` | **Nowy** — tabela |
| `src/lib/db/schema/index.ts` | **Zmiana** — eksport |
| `src/lib/db/migrations/XXXX_individual_session_requests.sql` | **Nowy** — migracja |
| `src/features/bookings/individual-request-schema.ts` | **Nowy** — Zod |
| `src/features/bookings/individual-request-actions.ts` | **Nowy** — server actions |
| `src/features/bookings/individual-request-data.ts` | **Nowy** — dane |
| `src/app/[locale]/(site)/zamow-lekcje/page.tsx` | **Nowy** — strona klienta |
| `src/app/[locale]/(site)/zamow-lekcje/order-form.tsx` | **Nowy** — formularz |
| `src/app/[locale]/(app)/dashboard/individual-requests/page.tsx` | **Nowy** — panel admina |
| `src/app/[locale]/(app)/dashboard/individual-requests/request-modal.tsx` | **Nowy** — modal obsługi |
| `messages/pl.json` | Nowe klucze |
| `messages/en.json` | Nowe klucze |

## Szacowany nakład

4–5 dni — nowa tabela, pełny backend, dwie ścieżki frontendu (klient + admin + trener), testy E2E.
