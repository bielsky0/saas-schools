# ChaiBuilder — Website Builder

ChaiBuilder to główny silnik CMS / website buildera dla tenantów. Każda akademia buduje i publikuje własną witrynę pod swoją subdomeną przez wizualny edytor drag-and-drop.

## Stack

- **Edytor:** `@chaibuilder/sdk` — fork w `packages/chaibuilder-sdk/`, podpięty jako pnpm workspace package
- **Renderer:** `RenderChaiBlocks` z `@chaibuilder/sdk/render` + `@chaibuilder/next` dla RSC
- **Styling:** Tailwind CSS v4 + `getChaiBuilderTailwindConfig()` + `getChaiThemeCssVariables()`
- **Bloki:** Rejestrowane przez `registerChaiBlock()` w `src/blocks/index.ts` i `src/lib/blocks-library.ts`

## Architektura

```
src/
  app/
    (builder)/editor/          Edytor wizualny dla staffu (pod subdomeną akademii)
    (public)/cms-page/[[...slug]]/page.tsx   Publiczny renderer stron CMS
  blocks/index.ts              Rejestracja custom bloków
  lib/blocks-library.ts        Fabryka bloków z typami ChaiBlock
  lib/block-data.ts            Przetwarzanie danych bloków
  features/cms/
    tenant-page-renderer.client.tsx   Client-side renderer
    get-blocks-css.ts                 CSS dla bloków
    components/theme-injector.tsx     Wstrzykiwanie CSS variables z theme
    builder-theme-data.ts             Dane motywu dla buildera
```

## Fork SDK

Fork `@chaibuilder/sdk` żyje w `packages/chaibuilder-sdk/` (wprowadzony przez `git subtree` z https://github.com/bielsky0/sdk, gałąź `saas-school-patches`).

**Powód forka:** audyt bezpieczeństwa wykrył IDOR-y i race condition (static `appId`) niekompatybilne z architekturą multi-tenant.

**Synchronizacja z upstream:**
```
git subtree pull --prefix=packages/chaibuilder-sdk sdk-fork dev --squash
```

## Bloki

Bloki rejestruje się przez `registerChaiBlock()`:

```ts
// src/blocks/index.ts
registerChaiBlock(GroupTypeCard, { type: 'GroupTypeCard', label: 'Karta zajęć' })
registerChaiBlock(UpcomingEvents, { type: 'UpcomingEvents', label: 'Nadchodzące zajęcia' })
registerChaiBlock(BookingButton, { type: 'BookingButton', label: 'Przycisk zapisu' })
registerChaiBlock(InstructorCard, { type: 'InstructorCard', label: 'Karta trenera' })
```

Bloki danych domenowych (np. `ScheduleGrid`) czytają dane przez zapytania w kontekście tenanta, nie przez relacje w schemacie.

## Stylowanie i motywy

- **Theme:** encja per-organization (fonty, kolory), wstrzykiwana jako CSS variables przez `ThemeInjector`
- **`getChaiThemeCssVariables()`** — generuje zmienne CSS z danych motywu
- **`getChaiBuilderTailwindConfig()`** — konfiguracja Tailwind dla buildera
- **Zakaz przechowywania klas Tailwind w bazie** — edytor eksponuje predefiniowane opcje, renderer mapuje przez słownik w kodzie

## Routing

| Ścieżka | Cel |
|---|---|
| `/editor` (subdomena akademii) | Edytor wizualny ChaiBuilder dla staffu |
| `/*` (subdomena akademii) | Publiczna strona CMS — renderowana przez `(public)/cms-page/[[...slug]]/page.tsx` |

## API

API dla stron CMS: `src/app/(builder)/editor/api/route.ts`
- `GET /api/pages` — lista stron
- `POST /api/pages` — tworzenie strony
- `PUT /api/pages` — aktualizacja strony
- `DELETE /api/pages` — usunięcie strony

## Konflikt wersji: framer-motion vs motion

SDK ma `framer-motion@12.23.20` (pin) obok `motion@^12.24.1`. Rozwiązane przez `pnpm.overrides` w root `package.json`:

```json
"overrides": {
  "motion": "12.24.1",
  "motion-dom": "12.24.0",
  "motion-utils": "12.23.28",
  "framer-motion": "12.23.20"
}
```

Overrides muszą zostać na stałe — nie usuwać przy porządkowaniu zależności.
