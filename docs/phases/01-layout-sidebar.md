# Faza 1: Layout panelu — sidebar + nawigacja rolowa

## Cel

Zastąpienie obecnego prostego layoutu (`header + content`) z `src/app/[locale]/(app)/layout.tsx` pełnym layoutem z sidebar'em i nawigacją dopasowaną do roli użytkownika, zgodnie z wireframe'ami panelu akademii.

## Stan obecny

`src/app/[locale]/(app)/layout.tsx` — prosty header z nazwą akademii, NotificationBell, ThemeToggle, SignOutButton. Brak nawigacji bocznej, brak podziału na sekcje, brak rolowej widoczności linków.

## Zakres

### 1. Sidebar layout (desktop)

- Stały sidebar po lewej stronie (szerokość ~260px)
- Header: logo/nazwa akademii + Avatar użytkownika
- Nawigacja podzielona na sekcje z `Separator`:
  - **Sekcja 1:** Dashboard
  - **Sekcja 2 (Zarządzanie):** Typy zajęć, Harmonogram, Trenerzy, Rodzice, Kredyty
  - **Sekcja 3 (Finanse):** Zarobki trenerów, Zakupy kredytów, Faktury
  - **Sekcja 4 (Admin):** Ustawienia, Audyt, Członkowie zespołu
- Aktywny link podświetlony (na podstawie `usePathname`)
- Stopka sidebaru: ThemeToggle, NotificationBell, SignOutButton

### 2. Mobile layout (hamburger + Sheet)

- Na ekranach < 768px: sidebar ukryty
- Hamburger button w górnym pasku otwiera `Sheet` z lewej strony
- Zawartość Sheet = ta sama nawigacja co sidebar
- Przycisk zamykania (X) w nagłówku Sheeta

### 3. Role-based navigation

Widoczność linków zależna od `effectivePermissions` użytkownika:

| Rola | Widoczne linki |
|------|---------------|
| **owner** | Wszystkie |
| **admin** | Wszystkie oprócz billing.manage, organization.delete, billing_connect.manage, custom_domain.manage, sms_credit.manage |
| **secretariat** | Dashboard, Harmonogram (view-only), Rodzice, Kredyty (potwierdzenia), Wnioski o zmianę grupy, Karty kwalifikacyjne, Zajęcia indywidualne, Opłaty dodatkowe |
| **reception** | Dashboard, Rodzice, Kredyty (potwierdzenia cash), Zakupy kredytów, Faktury, Broadcast, Karty kwalifikacyjne |
| **trainer** | Dashboard (własne zajęcia), Moje zajęcia, Moja dostępność, Wnioski urlopowe, Zarobki, Wnioski o lekcje ind. |
| **member** | Dashboard (podstawowy), Pliki |

### 4. Breadcrumbs (opcjonalnie)

- Ścieżka nawigacji nad contentem: `Dashboard > Typy zajęć > Edytuj`
- Używając istniejących tłumaczeń

## Komponenty shadcn/ui użyte

- `Sheet` — mobile sidebar drawer
- `Avatar` — zdjęcie użytkownika w headerze sidebaru
- `Separator` — linie między sekcjami
- `Skeleton` — loading state sidebaru
- `Button` — już istnieje

## Definition of Done

- [ ] Sidebar renderuje się na desktop (≥768px) z pełną nawigacją
- [ ] Na mobile (<768px) sidebar jest ukryty, hamburger otwiera `Sheet`
- [ ] Nawigacja pokazuje tylko linki zgodne z `effectivePermissions` roli
- [ ] Aktywny link (na podstawie aktualnej ścieżki) jest wizualnie wyróżniony
- [ ] Logout, ThemeToggle, NotificationBell są dostępne w sidebarze
- [ ] Przejście między stronami nie powoduje pełnego przeładowania (Link z next-intl)
- [ ] Sidebar nie znika przy nawigacji (layout zachowuje stan)
- [ ] Na stronie apex (bez akademii) — stary layout lub uproszczony sidebar
- [ ] Wszystkie teksty są w i18n (pl + en minimum)
- [ ] Mobile: zamknięcie Sheeta po kliknięciu w link

## Testy

### Unit / integracyjne (Vitest)
- [ ] `Sidebar` renderuje poprawne linki dla roli `owner`
- [ ] `Sidebar` renderuje poprawne linki dla roli `trainer`
- [ ] `Sidebar` renderuje poprawne linki dla roli `reception`
- [ ] `Sidebar` renderuje poprawne linki dla roli `member`
- [ ] Aktywny link ma klasę `active` / odpowiedni styl
- [ ] `MobileSidebar` — Sheet otwiera się po kliknięciu hamburgera

### E2E (Playwright)
- [ ] Admin loguje się → widzi pełen sidebar z wszystkimi sekcjami
- [ ] Trener loguje się → widzi tylko trenerskie linki
- [ ] Kliknięcie w link → nawigacja do strony → aktywny link podświetlony
- [ ] Mobile: hamburger → Sheet z nawigacją → kliknięcie linku → Sheet zamknięty, strona załadowana
- [ ] Sidebar scrolluje się gdy linków jest więcej niż wysokość ekranu

### Manualne QA
- [ ] Wygląd w light/dark mode
- [ ] Responsywność na breakpointach: 320px, 375px, 768px, 1024px, 1440px
- [ ] Test na rzeczywistym telefonie (iOS Safari, Android Chrome)

## Zależności

- **Faza 0** — komponenty shadcn/ui (Sheet, Avatar, Separator, Skeleton)

## Pliki do zmiany / utworzenia

| Plik | Akcja |
|------|-------|
| `src/app/[locale]/(app)/layout.tsx` | **Zmiana** — zastąpienie prostego layoutu |
| `src/components/sidebar.tsx` (NOWY) | Server component: sidebar z linkami |
| `src/components/sidebar-nav.tsx` (NOWY) | Client component: aktywny link, Sheet na mobile |
| `src/components/mobile-sidebar.tsx` (NOWY) | Client component: hamburger + Sheet |
| `src/components/sidebar-section.tsx` (NOWY) | Grupa linków z nagłówkiem i Separator |
| `src/components/sidebar-footer.tsx` (NOWY) | Stopka z ThemeToggle, NotificationBell, SignOut |
| `messages/pl.json` | Nowe klucze tłumaczeń sidebaru |
| `messages/en.json` | Nowe klucze tłumaczeń sidebaru |

## Szacowany nakład

2–3 dni — komponent Sidebar z wariantami rol, mobile responsive, testy.
