# Panel Akademii — plan implementacji wireframe'ów

Mapowanie wireframe'ów z `Panel akademii wireframes (offline).html` na istniejący kod i fazy implementacji.

## Organizacja plików

| Plik | Zawartość |
|------|-----------|
| `00-shadcn-components.md` | Instalacja 10 brakujących komponentów shadcn/ui |
| `01-layout-sidebar.md` | Layout z sidebar'em i nawigacją rolową |
| `02-admin-missing-pages.md` | Brakujące strony admina: klienci, extra fees, karty kwalifikacyjne, karty dashboardu |
| `03-trainer-panel.md` | Panel trenera: dashboard, moje zajęcia, wnioski o zmianę grupy |
| `04-leave-request-system.md` | System wniosków urlopowych (nowy backend + frontend) |
| `05-individual-sessions-client.md` | Flow zamawiania lekcji indywidualnych (nowy backend + frontend) |
| `06-client-settings.md` | Panel klienta: ustawienia powiadomień + polish |
| `07-dashboard-polish.md` | Dashboard home redesign, kalendarz, mobile QA, poprawki |

---

## Graficzny plan faz

```
Faza 0  ─── Instalacja 10 komponentów shadcn/ui
  │
Faza 1  ─── Layout panelu (sidebar + nawigacja rolowa + mobile)
  │
  ├── Faza 2  ─── Admin: brakujące strony (bazuje na istniejącym backendzie)
  ├── Faza 3  ─── Trener: panel (bazuje na istniejącym backendzie)
  └── Faza 6  ─── Klient: ustawienia (bazuje na istniejącym backendzie)

Faza 4  ─── System urlopów (NOWY backend — niezależny od 2/3/6)
Faza 5  ─── Lekcje indywidualne (NOWY backend — niezależny od 2/3/6; zależy od F3 dla widoku trenera)

Faza 7  ─── Polish + QA (zależy od wszystkich)
```

## Kolejność rekomendowana

1. **Faza 0** — fundament (1h)
2. **Faza 1** — layout (2–3 dni)
3. **Faza 2 + 3 + 6** — równolegle, frontend na istniejącym backendzie (6–9 dni łącznie)
4. **Faza 4** — urlopy, nowy backend (4–5 dni)
5. **Faza 5** — lekcje indywidualne, nowy backend (4–5 dni)
6. **Faza 7** — polish wszystkich widoków (3–4 dni)

**Łączny szacowany nakład: 17–24 dni**

---

## Mapowanie wireframe → faza

### Admin (owner)

| Ekran wireframe | Istnieje? | Faza |
|-----------------|-----------|------|
| Dashboard | ⚠️ Tylko buttony | F2, F7 |
| Typy zajęć | ✅ Full | — |
| Harmonogram | ✅ Full (tabela) | F7 (kalendarz) |
| Trenerzy | ✅ Full | — |
| Zarobki trenerów | ✅ Full | F7 (caveat o stawkach) |
| Rodzice i opiekunowie | ❌ Brak root page | F2 |
| Kredyty | ✅ Full | — |
| Zakupy kredytów | ✅ Full | — |
| Wnioski urlopowe trenerów | ❌ Nie istnieje | F4 |
| Grafik — tydzień z urlopem | ❌ Zależne od F4 | F4, F7 |
| Zajęcia indywidualne | ⚠️ Silnik istnieje, brak flow | F5 |
| Ustawienia | ✅ Full | — |
| Pełny audyt | ✅ Full | — |

### Trener

| Ekran wireframe | Istnieje? | Faza |
|-----------------|-----------|------|
| Dashboard ("Dzień dobry, Jan") | ❌ Brak | F3 |
| Moje zajęcia | ⚠️ Rozproszone po stronach | F3 |
| Moja dostępność | ✅ Full | — |
| Wnioski o zmianę grupy | ❌ Brak widoku trenera | F3 |
| Wniosek urlopowy | ❌ Nie istnieje | F4 |
| Zajęcia indywidualne — wnioski do mnie | ❌ Nie istnieje | F5 |
| Zarobki | ✅ Full (self-scope) | F7 (caveat) |

### Klient (rodzic)

| Ekran wireframe | Istnieje? | Faza |
|-----------------|-----------|------|
| /moje-zajecia | ✅ Full | F6 (polish) |
| Ustawienia powiadomień | ❌ Brak UI | F6 |
| Flow rejestracji /zapisy/... | ✅ Full | F6 (stepper) |
| Wyraź zainteresowanie | ✅ Full | — |
| Karta kwalifikacyjna | ✅ Full | — |
| Zamów lekcję indywidualną | ❌ Nie istnieje | F5 |
| Ustawienie hasła | ✅ Full | — |

---

## Nowy backend vs istniejący

### Istniejący backend (do użycia od razu)
- `listClients()`, `listExtraFees()`, `listQualificationCards()`
- `listUpcomingSessions()`, `listRosterForSession()`, `getSession()`
- `markAttendanceAction`, `enterGrade`, `addProgressNote`, `saveLessonTopic`
- `groupChangeRequest` (submit, approve, reject, cancel)
- `notification_preference` (get/set)
- `trainer_availability` (CRUD)
- `createSlotFirstBookingAction` (silnik sesji indywidualnych)

### Nowy backend do zbudowania
- **Faza 4:** `leave_request` tabela + CRUD + workflow approve/reject + zastępstwa
- **Faza 5:** `individual_session_request` tabela + CRUD + integracja z `slot_first`

---

## Kluczowe pliki projektu (referencje)

| Plik | Rola |
|------|------|
| `src/lib/db/schema/` | Wszystkie tabele Drizzle (56 plików) |
| `src/features/rbac/index.ts` | Role i permisje (6 ról, ~45 permisji) |
| `src/features/organizations/context.ts` | `requireOrgAccess()`, `requireOrgPermission()` |
| `src/app/[locale]/(app)/layout.tsx` | Layout panelu (do zmiany w F1) |
| `src/app/[locale]/(app)/dashboard/` | Wszystkie strony dashboardu |
| `src/app/[locale]/(site)/` | Publiczne strony klienta |
| `src/features/bookings/` | Rezerwacje, obecności, slot_first |
| `src/features/trainers/` | Trenerzy, dostępność, stawki, zarobki |
| `src/features/schedule/` | Sesje, harmonogram |
| `src/features/credits/` | Kredyty |
| `src/features/grades/` | Oceny |
| `src/features/lesson-logs/` | Tematy lekcji, notatki |
| `src/features/notifications/` | Powiadomienia i preferencje |
| `src/features/emails/categories.ts` | Kategorie powiadomień email |
| `components.json` | Konfiguracja shadcn/ui |
| `messages/pl.json`, `messages/en.json` | i18n |
