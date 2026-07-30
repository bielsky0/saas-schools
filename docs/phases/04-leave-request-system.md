# Faza 4: System wniosków urlopowych

## Cel

Zbudowanie kompletnego systemu wniosków urlopowych dla trenerów: od złożenia wniosku, przez akceptację/odrzucenie przez admina, po wizualizację w harmonogramie. To **nowy backend** — nie ma jeszcze tabeli ani logiki.

## Stan obecny

- ❌ Brak tabeli `leave_request`
- ❌ Brak logiki wniosków urlopowych
- ⚠️ `trainer_availability.isActive` — tylko checkbox do ręcznego wyłączenia okna dostępności, nie zastępuje workflow urlopowego
- ✅ `class_session.trainerId` — można sprawdzać konflikty sesji
- ✅ `substituteTrainerAction()` w `src/features/schedule/substitute-trainer.ts` — istnieje akcja przypisania zastępcy
- ✅ `audit_log` — gotowy do logowania akceptacji/odrzuceń

---

## Backend do zbudowania

### Nowa tabela: `leave_request`

```sql
CREATE TABLE leave_request (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  organizationId     TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  trainerId          TEXT NOT NULL REFERENCES "user"(id),
  startDate          DATE NOT NULL,          -- pierwszy dzień urlopu
  endDate            DATE NOT NULL,          -- ostatni dzień urlopu (włącznie)
  reason             TEXT,                   -- powód (opcjonalny, widoczny dla admina)
  status             TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','approved','rejected','cancelled')),
  substituteTrainerId TEXT REFERENCES "user"(id), -- zastępca (ustawiany przy approve)
  reviewedByUserId    TEXT REFERENCES "user"(id), -- kto approve/reject
  reviewedAt          TIMESTAMPTZ,           -- kiedy
  rejectionReason     TEXT,                  -- powód odrzucenia
  createdAt           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unikalność: jeden trener nie może mieć dwóch nakładających się wniosków
  CONSTRAINT leave_request_trainer_overlap_excl
    EXCLUDE USING gist (
      trainerId WITH =,
      daterange(startDate, endDate, '[]') WITH &&
    ) WHERE (status IN ('submitted', 'approved'))
);
```

**Uwagi:**
- `startDate`/`endDate` jako `DATE` (nie timestamp) — urlop jest całodniowy
- EXCLUDE constraint jak w `class_session` — zapobiega nakładaniu się dat
- RLS: `organizationId` dla izolacji tenantów
- Kompozytowy FK `(id, organizationId)` dla spójności z resztą schematu
- Tabela powinna mieć `UNIQUE(id, organizationId)` jak pozostałe tabele

### Nowe funkcje backendowe

**`src/features/trainers/leave-actions.ts`:**
- `submitLeaveRequest(data)` — trener składa wniosek
  - Walidacja: startDate ≤ endDate, daty nie w przeszłości, brak konfliktu z istniejącymi wnioskami
  - Sprawdzenie: czy w datach urlopu są zaplanowane sesje → jeśli tak, zapisanie liczby sesji, które potrzebują zastępcy
  - Guard: `requireOrgAccess()` + rola `trainer` + `trainerId === self`
- `approveLeaveRequest(requestId, substituteTrainerId?)` — admin zatwierdza
  - Opcjonalne przypisanie zastępcy
  - Jeśli przypisano zastępcę: automatyczne wywołanie `substituteTrainerAction()` dla każdej sesji w zakresie dat
  - Jeśli NIE przypisano zastępcy: sesje zostają bez trenera (do ręcznego ogarnięcia)
  - Guard: `requireOrgPermission("sessions.manage")` — admin/owner
- `rejectLeaveRequest(requestId, reason)` — admin odrzuca
  - Wymagany powód odrzucenia
  - Guard: `requireOrgPermission("sessions.manage")`
- `cancelLeaveRequest(requestId)` — trener anuluje własny wniosek
  - Tylko dla statusu `submitted` lub `approved` (jeśli approved → przywrócenie pierwotnego trenera)
  - Guard: `trainerId === self` LUB admin

**`src/features/trainers/leave-data.ts`:**
- `listLeaveRequests(filters?)` — lista wniosków z filtrami
  - Filtry: status, trainerId, dateRange
  - Sortowanie: data złożenia desc
  - Zwraca rozszerzone dane (nazwa trenera, liczba sesji w zakresie)
- `getLeaveRequest(id)` — szczegóły pojedynczego wniosku
- `getLeaveConflicts(trainerId, startDate, endDate)` — sesje kolidujące z urlopem
- `getActiveLeaves(organizationId, date?)` — aktywne urlopy na dany dzień (do harmonogramu)

### Walidacja (Zod schema)

**`src/features/trainers/leave-schema.ts`:**
```ts
export const submitLeaveSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
}).refine(d => d.startDate <= d.endDate, "Data końcowa musi być po dacie początkowej")
  .refine(d => d.startDate >= new Date(), "Nie można złożyć urlopu w przeszłości");

export const approveLeaveSchema = z.object({
  requestId: z.string().uuid(),
  substituteTrainerId: z.string().uuid().optional(),
});

export const rejectLeaveSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().min(1, "Podaj powód odrzucenia"),
});
```

### Migracja

Nowy plik w `src/lib/db/migrations/` — numerowana sekwencyjnie.

---

## Frontend do zbudowania

### 4a. Lista wniosków — panel admina (`/dashboard/leave-requests/`)

**Widok:**
- Tabs: "Oczekujące" / "Zatwierdzone" / "Odrzucone" / "Wszystkie"
- Tabela: Trener, Daty (od–do), Liczba sesji w zakresie, Status (badge), Data złożenia
- Kliknięcie w wiersz → modal/Sheet ze szczegółami

**Modal szczegółów (oczekujący):**
- Informacje: trener, daty, powód, liczba kolidujących sesji
- Lista kolidujących sesji z datą, grupą, lokalizacją
- Dropdown do wyboru zastępcy (Select z `listTrainers()`, domyślnie puste)
- Przyciski: "Zatwierdź" (zielony), "Odrzuć" (czerwony)
- Odrzucenie → pole tekstowe na powód

**Modal szczegółów (zatwierdzony/odrzucony):**
- Informacje + kto zatwierdził/odrzucił, kiedy, powód
- Przycisk "Anuluj" (jeśli w przyszłości)

### 4b. Złóż wniosek — panel trenera (`/dashboard/leave-requests/new/` lub modal)

**Formularz:**
- Date picker: zakres dat (Calendar z Fazy 0, range mode)
- Pola: Data od, Data do, Powód (textarea, opcjonalny)
- Podsumowanie przed wysłaniem:
  - "W tym okresie masz X zaplanowanych sesji."
  - "Po zatwierdzeniu urlopu sesje bez przypisanego zastępcy pozostaną bez trenera."
- Przycisk: "Złóż wniosek"

### 4c. Moje wnioski — panel trenera (`/dashboard/leave-requests/` lub sekcja w dashboardzie)

- Tabela własnych wniosków trenera (submit, cancel)
- Możliwość anulowania pending/approved wniosku
- Status z kolorem: submitted (żółty), approved (zielony), rejected (czerwony), cancelled (szary)

### 4d. Harmonogram z urlopem — panel admina

- W widoku harmonogramu (`/dashboard/schedule/`):
  - Sesje w dniu urlopu trenera mają dodatkowy badge "Urlop trenera"
  - Sesje z przypisanym zastępcą: nazwisko zastępcy z badge "Zastępstwo"
  - Sesje bez zastępcy: czerwony badge "Brak trenera!"
  - Filtrowanie: "Pokaż tylko sesje bez trenera"

### Komponenty shadcn/ui
- `Calendar` (z Fazy 0) — date picker zakresu dat
- `Tabs` (z Fazy 0) — filtrowanie statusów
- `Badge` (już istnieje) — statusy
- `Sheet` lub `Dialog` (już istnieje) — modal szczegółów
- `Select` (już istnieje) — wybór zastępcy
- `Skeleton` (z Fazy 0) — loading

---

## Definition of Done

### Backend
- [ ] Tabela `leave_request` w schemie z migracją
- [ ] EXCLUDE constraint na nakładające się urlopy jednego trenera
- [ ] `submitLeaveRequest` — trener może złożyć wniosek
- [ ] `approveLeaveRequest` — admin może zatwierdzić z opcjonalnym zastępcą
- [ ] Auto-podmiana trenera na zastępcę przy approve (jeśli podano)
- [ ] `rejectLeaveRequest` — admin może odrzucić z wymaganym powodem
- [ ] `cancelLeaveRequest` — trener/admin może anulować
- [ ] Walidacja: brak nakładania się, daty nie w przeszłości
- [ ] Audit log: wszystkie akcje (submit, approve, reject, cancel)
- [ ] RLS: dane izolowane per organizacja

### Frontend
- [ ] Admin: lista wniosków z filtrowaniem po statusie
- [ ] Admin: modal szczegółów wniosku z listą kolidujących sesji
- [ ] Admin: approve z dropdownem zastępcy, reject z powodem
- [ ] Trener: formularz składania wniosku z date pickerem
- [ ] Trener: lista własnych wniosków z możliwością anulowania
- [ ] Harmonogram: wizualne oznaczenie sesji w trakcie urlopu
- [ ] Harmonogram: badge "Brak trenera!" dla sesji bez zastępcy
- [ ] Wszystkie teksty w i18n
- [ ] Loading/empty states

---

## Testy

### Unit (Vitest)
- [ ] `submitLeaveRequest` — walidacja dat (start ≤ end, nie w przeszłości)
- [ ] `submitLeaveRequest` — odrzuca nakładające się wnioski
- [ ] `approveLeaveRequest` — z zastępcą: sesje podmienione
- [ ] `approveLeaveRequest` — bez zastępcy: sesje bez trenera
- [ ] `rejectLeaveRequest` — wymaga powodu
- [ ] `cancelLeaveRequest` — tylko własny wniosek (dla trenera)
- [ ] `getLeaveConflicts` — zwraca poprawne sesje w zakresie dat
- [ ] `listLeaveRequests` — filtrowanie po statusie, trenerze

### E2E (Playwright)
- [ ] Trener: składa wniosek urlopowy → pojawia się na liście admina
- [ ] Admin: widzi pending wniosek → otwiera modal → zatwierdza z zastępcą
- [ ] Admin: sesje w zakresie urlopu mają przypisanego zastępcę
- [ ] Admin: odrzuca wniosek → trener widzi odrzucony z powodem
- [ ] Trener: anuluje własny pending wniosek → znika z listy admina
- [ ] Harmonogram: sesja w dniu urlopu ma badge "Urlop trenera"
- [ ] EXCLUDE constraint: próba złożenia nakładającego się wniosku → błąd
- [ ] RLS: trener z org A nie widzi wniosków z org B

### Manualne QA
- [ ] Date picker działa na mobile
- [ ] Powiadomienia email: trener dostaje email o zatwierdzeniu/odrzuceniu
- [ ] Edge case: urlop na pojedynczy dzień
- [ ] Edge case: urlop bez kolidujących sesji
- [ ] Edge case: brak dostępnych zastępców w dropdownie

---

## Zależności

- **Faza 0** — komponenty shadcn/ui (Calendar, Tabs, Badge, Sheet, Select, Skeleton)
- **Faza 1** — sidebar z nawigacją do nowych stron
- **Faza 3** — dashboard trenera (link do wniosku urlopowego)

## Pliki do utworzenia / zmiany

| Plik | Akcja |
|------|-------|
| `src/lib/db/schema/leave-requests.ts` | **Nowy** — definicja tabeli |
| `src/lib/db/schema/index.ts` | **Zmiana** — eksport nowej tabeli |
| `src/lib/db/migrations/XXXX_leave_requests.sql` | **Nowy** — migracja |
| `src/features/trainers/leave-schema.ts` | **Nowy** — Zod schematy |
| `src/features/trainers/leave-actions.ts` | **Nowy** — server actions |
| `src/features/trainers/leave-data.ts` | **Nowy** — zapytania danych |
| `src/app/[locale]/(app)/dashboard/leave-requests/page.tsx` | **Nowy** — lista admin |
| `src/app/[locale]/(app)/dashboard/leave-requests/new/page.tsx` | **Nowy** — formularz trenera |
| `src/app/[locale]/(app)/dashboard/leave-requests/leave-request-modal.tsx` | **Nowy** — modal szczegółów |
| `src/app/[locale]/(app)/dashboard/schedule/page.tsx` | **Zmiana** — badge urlopu |
| `src/features/jobs/registry.ts` | **Zmiana** — job na auto-przypominanie? |
| `messages/pl.json` | Nowe klucze |
| `messages/en.json` | Nowe klucze |

## Szacowany nakład

4–5 dni — nowa tabela, migracja, EXCLUDE constraint, pełny backend + frontend + testy E2E.
