# Faza 3: Panel trenera

## Cel

Zbudowanie dedykowanych widoków dla roli **trainer** zgodnie z wireframe'ami. Większość backendu już istnieje — zadanie polega głównie na frontendzie łączącym istniejące akcje w spójne widoki.

## Stan obecny (rola trainer)

Trener ma obecnie dostęp do:
- `/dashboard/` — widzi tylko buttony, na które ma permisje (trainers, earnings)
- `/dashboard/trainers/[trainerId]/availability/` — zarządzanie własną dostępnością
- `/dashboard/trainers/earnings/` — własne zarobki (self-scope)
- `/dashboard/sessions/[sessionId]/` — roster sesji (view), może zaznaczać obecności, wpisywać oceny, notatki (tylko własne sesje)

Trener **nie ma**:
- Dedykowanego dashboardu z dzisiejszymi zajęciami
- Skonsolidowanego widoku "Moje zajęcia" (obecności + oceny + notatki + tematy lekcji w jednym miejscu)
- Widoku wniosków o zmianę grupy dla swoich zajęć
- Systemu wniosków urlopowych (→ Faza 4)
- Widoku wniosków o lekcje indywidualne (→ Faza 5)

---

## 3a. Dashboard trenera (`/dashboard/` z rolą trainer)

### Backend (już istnieje)
- `listUpcomingSessions()` w `src/features/schedule/data.ts`
- `class_session` ma `trainerId` — można filtrować
- `listRosterForSession()` — lista uczestników sesji
- `getSession()` — szczegóły sesji

### Zakres frontendu

Zamiast ogólnego AcademyHome, gdy `role === 'trainer'`:

**Sekcja 1: "Dzień dobry, [Imię]"** — powitanie z imieniem trenera

**Sekcja 2: Dzisiejsze zajęcia**
- Karty sesji na dziś (w strefie czasowej organizacji):
  - Godzina, nazwa grupy, lokalizacja
  - Liczba zapisanych / capacity
  - Meeting link (aktywny 15 min przed)
  - Przycisk: "Lista obecności" → modal/inline z checkboxami (już istnieje `AttendanceControls`)

**Sekcja 3: Nadchodzące zajęcia**
- Tabela/lista sesji na najbliższe 7 dni
- Kolumny: Data, Godzina, Grupa, Lokalizacja, Zapisani

**Sekcja 4: Szybkie akcje**
- Linki: Moja dostępność, Wniosek urlopowy (→ Faza 4), Zarobki

### Komponenty
- `Card` (już istnieje), `Badge` (już istnieje)
- `Avatar` (z Fazy 0) — awatar trenera
- `Skeleton` (z Fazy 0) — loading

### DoD
- [ ] Trener po zalogowaniu widzi spersonalizowany dashboard
- [ ] Dzisiejsze zajęcia pokazują tylko sesje danego trenera
- [ ] Kliknięcie w sesję → `/dashboard/sessions/[id]`
- [ ] Powitanie z imieniem (z `session.user`)
- [ ] Loading skeleton dla każdej sekcji
- [ ] Empty state: "Nie masz dziś żadnych zajęć" gdy brak sesji

---

## 3b. Moje zajęcia (`/dashboard/my-classes/`)

### Backend (już istnieje)
- `listUpcomingSessions()` z filtrem `trainerId = self`
- `listRosterForSession()` — uczestnicy
- `markAttendanceAction()` — zaznaczanie obecności (już egzekwuje `trainerId === session.trainerId`)
- `enterGrade()` — wpisywanie ocen (już egzekwuje własność sesji)
- `addProgressNote()` — notatki o uczestniku
- `saveLessonTopic()` — temat lekcji
- `createHomeworkEntry()` / `markHomeworkCompletion()` — zadania domowe
- `getLessonTopicBySession()` — pobieranie tematu

### Zakres frontendu

**Widok skonsolidowany** — jedna strona agregująca wszystkie akcje trenera dla jego sesji:

**Filtry górne:**
- Tabs: "Nadchodzące" / "Przeszłe" / "Wszystkie"
- Wyszukiwarka po nazwie grupy

**Tabela sesji:**
- Data, Godzina, Grupa, Liczba zapisanych
- Kliknięcie w wiersz → rozwija panel poniżej (lub modal)

**Panel sesji (rozwijany / Accordion):**
- **Lista obecności:** checkboxy przy każdym uczestniku (obecny/nieobecny)
- **Oceny:** dynamiczne pola ocen (już istnieje `EnterGradeForm`)
- **Temat lekcji:** input + textarea (już istnieje `LessonTopicForm`)
- **Zadania domowe:** formularz dodawania + lista z checkboxami wykonania (już istnieje `HomeworkForm`)
- **Notatki:** pola textarea przy każdym uczestniku (już istnieje `ProgressNoteForm`)

### Komponenty shadcn/ui
- `Accordion` (z Fazy 0) — rozwijane panele sesji
- `Tabs` (z Fazy 0) — filtrowanie nadchodzące/przeszłe
- `Checkbox` (z Fazy 0) — lista obecności
- `Badge` (już istnieje), `Card` (już istnieje)

### DoD
- [ ] Trener widzi listę swoich sesji
- [ ] Rozwinięcie sesji pokazuje pełny panel z obecnościami, ocenami, tematem, notatkami
- [ ] Wszystkie akcje (attendance, grades, notes, topic) działają
- [ ] Zapis stanu per sesja — nie traci się danych przy przełączaniu
- [ ] Filtrowanie nadchodzące/przeszłe działa
- [ ] Empty state dla braku sesji

### Testy
- [ ] E2E: Trener loguje się → widzi swoje sesje
- [ ] E2E: Trener zaznacza obecności → zapisuje → dane persistują
- [ ] E2E: Trener NIE widzi sesji innego trenera
- [ ] E2E: Rozwinięcie Accordeonu → wszystkie sekcje obecne
- [ ] E2E: Zapis oceny → pojawia się w panelu
- [ ] Unit: `listUpcomingSessions` z filtrem `trainerId = self` zwraca tylko własne

---

## 3c. Wnioski o zmianę grupy — widok trenera (`/dashboard/group-change-requests/`)

### Backend (już istnieje)
- `groupChangeRequest` tabela — pełny workflow
- `change-group.ts` — submit (klient)
- `change-group-admin.ts` — approve/reject (admin)
- Statusy: submitted, admin_approved, admin_rejected, awaiting_payment, completed, expired, cancelled_by_admin, cancelled_by_client

### Zakres frontendu

**Widok tylko-do-odczytu dla trenera:**

- Lista wniosków dotyczących **jego sesji** (gdzie `targetSession.trainerId = self` lub `sourceBooking.session.trainerId = self`)
- Kolumny: Klient, Z: grupa źródłowa → Do: grupa docelowa, Data sesji docelowej, Status (badge), Data zgłoszenia
- Sortowanie po dacie zgłoszenia (najnowsze na górze)
- Filtrowanie po statusie (Tabs: Wszystkie / Oczekujące / Zatwierdzone / Odrzucone)
- **Brak akcji** dla trenera — tylko podgląd. Trener nie może approve/reject (to domena admina/secretariatu)

### DoD
- [ ] Trener widzi tylko wnioski dotyczące jego sesji
- [ ] Filtrowanie po statusie działa
- [ ] Kliknięcie w wniosek → szczegóły (modal lub rozwijany panel)
- [ ] Empty state: "Brak wniosków o zmianę grupy"

### Testy
- [ ] E2E: Trener widzi wnioski dla swojej sesji
- [ ] E2E: Trener NIE widzi wniosków dla sesji innego trenera
- [ ] E2E: Filtry po statusie

---

## Zależności

- **Faza 0** — komponenty shadcn/ui (Avatar, Skeleton, Tabs, Accordion, Checkbox)
- **Faza 1** — sidebar (do nawigacji do nowych stron)
- **Faza 4** — wnioski urlopowe (link z dashboardu trenera)
- **Faza 5** — wnioski o lekcje indywidualne (widok trenera)

## Pliki do utworzenia / zmiany

| Plik | Akcja |
|------|-------|
| `src/app/[locale]/(app)/dashboard/page.tsx` | **Zmiana** — warunek roli → trainer dashboard vs admin dashboard |
| `src/app/[locale]/(app)/dashboard/trainer-dashboard.tsx` | **Nowy** — dashboard trenera |
| `src/app/[locale]/(app)/dashboard/my-classes/page.tsx` | **Nowy** — moje zajęcia |
| `src/app/[locale]/(app)/dashboard/my-classes/session-panel.tsx` | **Nowy** — rozwijany panel sesji |
| `src/app/[locale]/(app)/dashboard/my-classes/attendance-section.tsx` | **Nowy** — lista obecności |
| `src/app/[locale]/(app)/dashboard/my-classes/grades-section.tsx` | **Nowy** — sekcja ocen |
| `src/app/[locale]/(app)/dashboard/my-classes/topic-section.tsx` | **Nowy** — temat lekcji |
| `src/app/[locale]/(app)/dashboard/group-change-requests/page.tsx` | **Nowy** — widok wniosków dla trenera |
| `messages/pl.json` | Nowe klucze |
| `messages/en.json` | Nowe klucze |

## Szacowany nakład

3–4 dni — trzy nowe widoki + integracja istniejących akcji backendowych.
