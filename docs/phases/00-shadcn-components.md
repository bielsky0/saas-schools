# Faza 0: Fundamenty — komponenty shadcn/ui

## Cel

Instalacja wszystkich brakujących komponentów shadcn/ui wymaganych przez wireframe'y panelu akademii.

## Zakres

### Komponenty do doinstalowania (10 sztuk)

Według wireframe'ów (`Panel akademii wireframes (offline).html`), w stopce każdego panelu widnieje lista:

| Komponent | Użycie w wireframe'ach |
|-----------|----------------------|
| **Tabs** | Nawigacja wewnątrz stron (np. kredyty: przyznane / historia, moje zajęcia: aktywne / archiwalne) |
| **Sheet** | Drawer boczny na mobile (hamburger menu), panel boczny detali |
| **Calendar** | Harmonogram, kalendarz dostępności trenera, wybór daty urlopu |
| **Avatar** | Awatary trenerów, klientów, członków zespołu |
| **Separator** | Linie podziału w sidebarze, między sekcjami |
| **Skeleton** | Loading states we wszystkich widokach panelu |
| **Checkbox** | Potwierdzenia obecności, ustawienia powiadomień, zgody RODO |
| **RadioGroup** | Wybór metody płatności, wybór trenera w lekcjach indywidualnych |
| **Switch** | Przełączniki ustawień (np. aktywny/nieaktywny, włącz/wyłącz powiadomienia) |
| **Accordion** | Rozwijane sekcje (np. FAQ, szczegóły grupy, historia) |

### Gdzie zostaną zainstalowane

Zgodnie z `components.json` (alias `ui` → `@/features/cms/admin/components/ui`), target dla `npx shadcn add`:

```
src/features/cms/admin/components/ui/
```

Dodatkowo, jeśli komponent jest potrzebny poza CMS admin (np. w panelu klienta na `(site)`), należy też utworzyć wersję w `src/components/ui/`.

### Komenda instalacji

```bash
npx shadcn add tabs sheet calendar avatar separator skeleton checkbox radio-group switch accordion
```

### Komponenty już istniejące w projekcie (nie do instalacji)

`src/components/ui/`: input, textarea, select, dropdown-menu, button, table, badge, dialog, alert, sonner, field, card, pagination

`src/features/cms/admin/components/ui/`: input, textarea, select, button, dialog, command, tooltip, label, popover, card, alert-dialog

## Definition of Done

- [ ] Wszystkie 10 komponentów zainstalowanych przez `npx shadcn add`
- [ ] Pliki `.tsx` każdego komponentu istnieją w `src/features/cms/admin/components/ui/`
- [ ] Build przechodzi (`pnpm build` lub `next build` bez błędów)
- [ ] Nie ma konfliktów z istniejącymi komponentami (np. `calendar` nie koliduje z niczym)
- [ ] Jeśli komponent wymaga dodatkowych zależności (np. `react-day-picker` dla Calendar, `@radix-ui/react-tabs` dla Tabs), są one dodane do `package.json` poprawnie

## Testy

### Unit / integracyjne
- [ ] Każdy komponent renderuje się bez crashu (podstawowy smoke test)
- [ ] Test z `vitest`: render każdego komponentu z minimalnymi props

### E2E (Playwright)
- Brak — testy E2E dla konkretnych użyć komponentów będą w kolejnych fazach

### Manualne QA
- [ ] Sprawdzić, że `pnpm dev` startuje bez błędów
- [ ] Otworzyć storybook lub testową stronę z każdym komponentem
- [ ] Sprawdzić wygląd w light/dark mode

## Zależności

- ❌ Brak zależności od innych faz
- ✅ Ta faza jest **prerequisitem** dla wszystkich kolejnych faz (1–7)

## Pliki do zmiany / utworzenia

| Plik | Akcja |
|------|-------|
| `src/features/cms/admin/components/ui/tabs.tsx` | Nowy (shadcn generate) |
| `src/features/cms/admin/components/ui/sheet.tsx` | Nowy |
| `src/features/cms/admin/components/ui/calendar.tsx` | Nowy |
| `src/features/cms/admin/components/ui/avatar.tsx` | Nowy |
| `src/features/cms/admin/components/ui/separator.tsx` | Nowy |
| `src/features/cms/admin/components/ui/skeleton.tsx` | Nowy |
| `src/features/cms/admin/components/ui/checkbox.tsx` | Nowy |
| `src/features/cms/admin/components/ui/radio-group.tsx` | Nowy |
| `src/features/cms/admin/components/ui/switch.tsx` | Nowy |
| `src/features/cms/admin/components/ui/accordion.tsx` | Nowy |
| `package.json` | Aktualizacja (nowe zależności od shadcn add) |

## Szacowany nakład

1h — instalacja gotowych komponentów z shadcn registry.
