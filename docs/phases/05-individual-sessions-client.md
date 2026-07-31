# Faza 5: Zajęcia indywidualne — flow klienta

## Cel

Flow zamawiania lekcji indywidualnych przez klienta (rodzica) w modelu **slot-first** (EPIK 34, §2.32). Rodzic wybiera trenera i konkretny termin z wyliczonej dostępności — bez pośrednika w postaci "wniosku", który ktoś musiałby obsłużyć.

## Zakres (po zawężeniu)

Ten dokument opisuje **publiczny flow klienta** dla `slot_first`. Celowo wyłączone z fazy:

- ❌ **Brak tabeli `individual_session_request`** — slot-first nie tworzy wniosków; rezerwuje termin bezpośrednio
- ❌ **Brak dedykowanej strony zamówienia** — flow żyje na istniejącej stronie `/zapisy/{slug}`
- ❌ **Brak publicznej strony trenera** — trener jest opcją w select, nie osobnym landingiem
- ❌ **`availability_first`** niezmienione — nadal traktowane jak schedule-first

## Stan obecny

### Co istnieje (backend)
- ✅ `slot_first` engine w `group_type` — tworzy sesję + booking w jednej transakcji (admin side: `slot-first.ts`)
- ✅ `trainer_availability` — okna dostępności trenerów
- ✅ `computeAvailabilitySlots()` — wyliczanie wolnych slotów (pure)
- ✅ `eligibleTrainerIds` na `group_type` — którzy trenerzy mogą prowadzić
- ✅ `defaultDurationMinutes` + `defaultLocationId` na `group_type`
- ✅ `client_price_override` — indywidualne ceny

### Co dobudowano w tej fazie
- ✅ Konfiguracja admina: `eligibleTrainerIds` (checkboxy trenerów) + `defaultDurationMinutes` w formularzu typu grupy
- ✅ Publiczny `createSlotFirstBookingAction()` w `src/features/bookings/slot-first-public.ts`
- ✅ Publiczna strona `/zapisy/{slug}` z branżowaniem po `engine === "slot_first"` i prefill `?trainerId=`
- ✅ Powiadomienia: `booking-confirmed` (klient) + `slot-first-session-created` (trener)

---

## Architektura flow slot-first

### Konfiguracja (admin)
`GroupTypeForm` zyskuje dwa pola (`src/features/groups/components/group-type-form.tsx`):

1. **Dostępni trenerzy** (`eligibleTrainerIds`) — checkboxy aktywnych trenerów; puste = wszyscy trenerzy aktywnej organizacji
2. **Domyślny czas trwania** (`defaultDurationMinutes`) — długość wyliczanych slotów; fallback 60 min

Pole zapisywane przez `createGroupTypeAction` / `updateGroupTypeAction` (`groups/actions.ts`, walidacja `strList(..., "eligibleTrainerIds")`; pusta lista zapisywana jako `null`).

### Strona publiczna (`/zapisy/{slug}`)
`src/app/[locale]/(site)/zapisy/[groupTypeSlug]/page.tsx`:

1. `requireServedOrganization()` — ta sama straż co schedule-first
2. Branża po `engine === "slot_first"` (przed zwykłym `EnrollmentFlow`)
3. Lista trenerów: `listTrainers` przefiltrowana przez `eligibleTrainerIds` (puste = wszyscy)
4. `listSlotFirstAvailability(tx, org.id, { trainerIds, defaultDurationMinutes, from, to, timeZone })` — slota per trener na miesiąc otwarcia
5. `?trainerId=` — prefill honorowany tylko gdy trener jest w `eligibleTrainerIds`
6. Renderuje `SlotFirstFlow`

### Flow UI (`src/features/bookings/components/slot-first-flow.tsx`)
`SlotFirstFlow` — 3 kroki:

1. **Wybór trenera** — `<select>` z dostępnych trenerów; nawigacja po miesiącach (linki, proxy działa — F4.6)
2. **Wybór slotu** — siatka przycisków `data-start-time="{dayKey}T{startsAt}"` z `computeAvailabilitySlots`
3. **Potwierdzenie** — `VerifyStep` (OTP dla nowych rodziców) → `SlotFirstConfirmStep` (uczestnik, metoda płatności, zgody, polityka, karta kwalifikacyjna)

Wspólne kroki (`VerifyStep`, `SuccessStep`, policy/consents) są wyeksportowane z `enrollment-flow.tsx` i współdzielone.

### Akcja (`src/features/bookings/slot-first-public.ts`)
`createSlotFirstBookingAction(prev, formData)`:

1. `requireServedOrganization()` + `resolveClientSession(org.id)` — nieweryfikowany rodzic dostaje `errors.verifyFirst`
2. Walidacja `createSlotFirstBookingSchema(t)` (rozszerza standardowy schema, ale **bez `sessionId`** — sesja jeszcze nie istnieje)
3. W jednej transakcji `withTenant`:
   - `getGroupTypeBySlug` + sprawdzenie `engine === "slot_first"`
   - `getTrainer` + egzamin `eligibleTrainerIds`
   - `wallClockToInstant(startTime, org.timezone)` — wall-clock slot (US-1.2)
   - **Re-walidacja slotu**: `listAvailability` + `computeAvailabilitySlots` dla tego samego dnia lokalnego — slot musi być w wyniku
   - Insert `class_session` (capacity 1, `defaultDurationMinutes`/60, `defaultLocationId`) + audyt
   - `createBooking` — ten sam pojedynczy writer co schedule-first, bierze miejsce
   - Powiadomienia **w transakcji** (outbox): `booking-confirmed` → klient, `slot-first-session-created` → trener
4. Po commicie: przy `payment_pending` → `startConnectCheckout` (redirect do Stripe Checkout)

**Konflikty** — ostatnie słowo ma EXCLUDE constraint `class_session_trainer_no_overlap_excl` (23P01): kolizja między re-walidacją a insertem staje się przyjaznym komunikatem `errors.trainerConflict`.

### Powiadomienia
- Migracja `0071_faza5_slot_first_notify.sql` — event types `booking-confirmed` + `slot-first-session-created`
- Email: `booking-confirmed.tsx` (do rodzica), `slot-first-session-created.tsx` (do trenera), zarejestrowane w `contract.ts` + `templates/index.ts` + `emit.ts` + `categories.ts`
- In-app: `notifications/types.ts` + klucze `notifications.types.*` w `pl.json`/`en.json`

---

## Definition of Done

### Backend
- [x] Konfiguracja admina: `eligibleTrainerIds` + `defaultDurationMinutes`
- [x] `createSlotFirstBookingSchema` — bez `sessionId`
- [x] `createSlotFirstBookingAction` — trainer eligibility, wall-clock slot, re-walidacja w transakcji
- [x] `listSlotFirstAvailability` w `bookings/data.ts`
- [x] Sesja (capacity 1) + booking w jednej transakcji
- [x] Powiadomienia: `booking-confirmed` + `slot-first-session-created`
- [x] Seeder e2e: `eligibleTrainerIds` + `availability` w `seed-langlion`

### Frontend
- [x] `?trainerId=` prefill (tylko dla eligible trenerów)
- [x] `SlotFirstFlow` — trener → slot → potwierdzenie
- [x] Współdzielone kroki (OTP, success, policy/consents) z `enrollment-flow.tsx`
- [x] Wszystkie teksty w i18n (`pl.json`/`en.json`)
- [ ] Wizualny pass `SlotFirstFlow` (select styled bezpośrednio, `formatDay()`)

### Testy
- [x] Unit: `slot-first-schema.test.ts` (5 testów — brak `sessionId`, trainer/startTime/payment/participant)
- [x] E2E: `langlion-slot-first.spec.ts` (happy path przez UI, `eligibleTrainerIds` ukrywa trenerów, brak slotu poza oknem)
- [ ] E2E: forge submission nieosiągalnego slotu → `errors.slotUnavailable` (wymaga bezpośredniego wywołania akcji)

### Powiadomienia
- [x] Migracja event types
- [x] Szablony email + i18n (PL/EN)
- [x] In-app notifications types

---

## Zależności

- **Faza 5 admin** — `slot-first.ts` (create-owa strona, admin flow)
- **F17.5** — `trainer_availability` + `computeAvailabilitySlots`
- **F4/F5** — `createBooking` (pojedynczy writer), `payment-options.ts`, `VerifyStep`
- **F21** — `resolveClientPrice`
- **F24** — consents (`parseAthleteConsents`)

## Pliki (zmiana / utworzenie)

| Plik | Akcja |
|------|-------|
| `src/features/bookings/slot-first-public.ts` | **Nowy** — publiczna akcja slot-first |
| `src/features/bookings/components/slot-first-flow.tsx` | **Nowy** — flow UI |
| `src/features/bookings/slot-first-schema.test.ts` | **Nowy** — testy walidacji |
| `src/features/bookings/schema.ts` | **Zmiana** — `createSlotFirstBookingSchema` |
| `src/features/bookings/data.ts` | **Zmiana** — `listSlotFirstAvailability` |
| `src/features/bookings/components/enrollment-flow.tsx` | **Zmiana** — export współdzielonych kroków |
| `src/app/[locale]/(site)/zapisy/[groupTypeSlug]/page.tsx` | **Zmiana** — branch `slot_first` + prefill |
| `src/features/groups/components/group-type-form.tsx` | **Zmiana** — pola admina |
| `src/features/groups/actions.ts`, `src/features/groups/schema.ts` | **Zmiana** — walidacja/persystencja |
| `src/lib/db/migrations/0071_faza5_slot_first_notify.sql` | **Nowy** — event types |
| `src/lib/adapters/email/{contract.ts, templates/*}` | **Zmiana** — szablony email |
| `src/features/emails/categories.ts`, `src/features/notifications/{emit,types}.ts` | **Zmiana** — rejestracja |
| `src/lib/i18n/messages/{pl,en}.json` | **Zmiana** — klucze |
| `src/app/api/dev/seed-langlion/route.ts` | **Zmiana** — `eligibleTrainerIds` + `availability` w seederze |
| `e2e/langlion-slot-first.spec.ts` | **Nowy** — testy e2e |

## Szacowany nakład

~2–3 dni — brak nowej tabeli i paneli admina; flow klienta na istniejącej stronie rezerwacji + powiadomienia.
