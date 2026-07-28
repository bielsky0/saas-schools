# PagesEditView — Pełna migracja na Tailwind v4 + shadcn/ui

**Status**: Plan gotowy do wykonania. Blocker: tryb read-only.

---

## Krok 0 — Dark mode (zweryfikowany ✅)

Payload używa `html[data-theme="dark"]` w selektorach komponentów (`[data-theme=dark] .btn {...}`), ale **NIE definiuje `--theme-elevation-*` pod `html[data-theme=dark]`**. Jest tylko jeden blok `html[data-theme=dark]` w całym CSS Payloada — dla zmiennych diff-related.

Konsekwencja: `@theme inline { --color-primary: var(--brand-accent-600); ... }` da te SAME wartości w light i dark mode. Shadcn komponenty nie zareagują na dark mode automatycznie.

**Decyzja**: Na tym etapie nie dodajemy dark mode overrides. Zostanie dodane w osobnej turze przez blok `html[data-theme='dark'] { --color-*: ... }` w `tailwind.css`. W Kroku 7 testujemy w light mode.

---

## Krok 1 — Stworzyć `src/features/cms/admin/styles/tailwind.css`

```css
/*
 * Tailwind v4 entry dla PagesEditView (i custom admin UI).
 * layer(utilities) — pomija Preflight/base reset (nie psuje globalnych stylów Payloada).
 * Importowany TYLKO w pages-edit-view.client.tsx — Next.js ładuje go tylko w chunku.
 * Dark mode: do dodania w osobnej turze (payload nie definiuje --theme-elevation-* pod
 * [data-theme=dark]).
 */
@import "tailwindcss" layer(utilities);

@theme inline {
  /* B: referencje do istniejących zmiennych Payload/brand */
  --color-background: var(--theme-bg);
  --color-foreground: var(--theme-text);
  --color-primary: var(--brand-accent-600);
  --color-primary-foreground: var(--theme-elevation-0);
  --color-secondary: var(--theme-elevation-150);
  --color-secondary-foreground: var(--theme-elevation-600);
  --color-muted: var(--theme-elevation-100);
  --color-muted-foreground: var(--theme-elevation-400);
  --color-accent: var(--brand-accent-50);
  --color-accent-foreground: var(--brand-accent-700);
  --color-destructive: var(--theme-danger-500);
  --color-destructive-foreground: var(--theme-danger-100);
  --color-border: var(--theme-border-color);
  --color-input: var(--theme-elevation-200);
  --color-ring: var(--brand-accent);

  /* F: fallback — brak dedykowanego tokenu Payload */
  --color-card: var(--theme-elevation-0);
  --color-card-foreground: var(--theme-elevation-700);
  --color-popover: var(--theme-elevation-50);
  --color-popover-foreground: var(--theme-elevation-700);

  /* A: ręczne — Payload nie ma odpowiednika */
  --radius: 0.5rem;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}
```

**Plik**: `src/features/cms/admin/styles/tailwind.css`

---

## Krok 2 — Importy w `pages-edit-view.client.tsx`

W pliku `pages-edit-view.client.tsx` dodać DWA importy OBOK istniejącego importu SCSS:

```tsx
import "../styles/admin-overrides.scss"   // brand tokens — EFEKT GLOBALNY (zamierzony)
import "../styles/tailwind.css"           // Tailwind utilities — tylko ten chunk
```

Obecny import `"./pages-edit-view.scss"` zostawiamy (jest w pełni zakomentowany — no-op). Zostanie usunięty w Kroku 6 po weryfikacji referencji.

---

## Krok 3 — components.json + shadcn/ui

Stworzyć `components.json` w root projektu:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/features/cms/admin/styles/tailwind.css",
    "baseColor": "stone",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/features/cms/admin/components",
    "ui": "@/features/cms/admin/components/ui",
    "utils": "@/lib/utils"
  }
}
```

### Inwentaryzacja elementów UI w PagesEditView i pod-komponentach

Na podstawie przeczytanego kodu:

| Komponent | Używa | Zastąpić shadcn? |
|---|---|---|
| PagesEditView — Button (z `@/components/ui`) | `import { Button } from "@/components/ui"` | ✅ Adminowy shadcn Button |
| PagesEditView — FormField, FormMessage, Input (z `@/components/ui`) | Importowane z `@/components/ui` | ✅ Adminowe shadcn odpowiedniki |
| BlocksField — Button (z `@payloadcms/ui`) | `import { Button } from "@payloadcms/ui"` (line 43) | ⚠️ Zależy od kontekstu — Payloadowy Button ma API specyficzne dla CMS |
| BlocksField — RenderFields (z `@payloadcms/ui`) | `import { RenderFields } from "@payloadcms/ui"` | ❌ Brak odpowiednika shadcn — komponent zależny od Payload API |
| BlocksField — ConfirmationModal (z `@payloadcms/ui`) | `import { ConfirmationModal } from "@payloadcms/ui"` | 🔄 Można zastąpić shadcn Dialog |
| BlocksField — useFormFields, useForm, useModal (Payload hooks) | hooks | ❌ Nie zastępujemy — to logika, nie UI |
| PagesEditView — DocumentControls (z `@payloadcms/ui`) | `import { DocumentControls } from "@payloadcms/ui"` | ❌ Specyficzny dla Payload dokumentu |
| PagesEditView — LivePreviewWindow (z `@payloadcms/ui`) | `import { LivePreviewWindow } from "@payloadcms/ui"` | ❌ Specyficzny dla Payload |

**Zalecane komponenty do instalacji**: `button card input select dialog`

Komendy:
```bash
npx shadcn@latest add button card input select dialog -y
```

Jeśli CLI wygeneruje kod z `@tailwind base/components/utilities` (v3 syntax) — skopiować ręcznie z `src/components/ui/` do `src/features/cms/admin/components/ui/` i zmienić import `cn` na `@/lib/utils`.

---

## Krok 4 — Pełna migracja `pages-edit-view.client.tsx`

### 4a. Layout — sidebar + preview

Zakomentowany `pages-edit-view.scss` definiuje:

| Klasa BEM | Reguła SCSS | Ekwiwalent Tailwind |
|---|---|---|
| `.pages-edit-view__body` | `display: flex; flex: 1; min-height: 0` | `flex flex-1 min-h-0` |
| `.pages-edit-view__sidebar` | `width: 400px; min-width: 320px; overflow-y: auto; border-right: 1px solid var(--theme-elevation-150); display: flex; flex-direction: column` | `w-96 min-w-80 overflow-y-auto border-r border-border flex flex-col` |
| `.pages-edit-view__meta` | `padding: 1rem; border-bottom: 1px solid var(--theme-elevation-100)` | `p-4 border-b border-border/50` |
| `.pages-edit-view__blocks` | `flex: 1; overflow-y: auto; padding: 0.75rem` | `flex-1 overflow-y-auto p-3` |
| `.pages-edit-view__preview` | `flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--theme-elevation-0)` | `flex-1 flex flex-col min-w-0 bg-background` |

### 4b. Zmiana importów

- `import { Button } from "@/components/ui"` → `import { Button } from "@/features/cms/admin/components/ui"`
- Analogicznie dla innych shadcn komponentów (Input, Card, Dialog itd.)
- Payload-specific komponenty (DocumentControls, LivePreviewWindow, RenderFields) zostają

### 4c. Elementy, które NIE są migrowane na shadcn

| Element | Powód |
|---|---|
| `DocumentControls` | Payload-specific — zarządza dokumentem, wersjami, publikacją |
| `LivePreviewWindow` | Payload-specific — podgląd live |
| `RenderFields` | Payload-specific — renderuje pola formularza |
| `useForm`, `useFormFields` | Hooks, nie UI |
| `BlocksField` — Payloadowy Button dla Add Block | Używa Payload API modali — zostawić lub zastąpić dopiero po testach |
| `ConfirmationModal` | Można zastąpić shadcn Dialog — ale wymaga refaktora logiki modal |

---

## Krok 5 — Sprawdzenie referencji przed usunięciem pliku

```bash
grep -rn "pages-edit-view.scss" src/
```

Oczekiwany wynik: tylko wystąpienie w `pages-edit-view.client.tsx`.

---

## Krok 6 — Usunięcie `pages-edit-view.scss`

Po potwierdzeniu z Kroku 5: usunąć plik.

---

## Krok 7 — Test regresji

Po `npm run dev` sprawdzić:

| Test | Kryterium |
|---|---|
| Pages Edit View | Layout sidebar+preview, shadcn Button/Input/Card renderują się poprawnie |
| Interakcje w widoku | Przyciski, pola działają (save, publish, add block, delete block) |
| Versions tej strony | Layout niezmieniony — tylko kolory z admin-overrides.scss |
| API tej strony | Bez zmian |
| Lista kolekcji Pages | Nav i lista — tylko zmiana kolorów (zamierzone) |
| Lista kolekcji Media | jw. |
| Edycja Media (bez custom Edit View) | Natywne pola Payloada nietknięte |
| Build | Brak błędów o brakujących importach |
| DevTools | Dla elementów z Tailwind klasami — sprawdzić która reguła wygrywa w specificity |

---

## Uwagi

1. **Dark mode**: Nie obsłużony w tej turze. Dodać w osobnej iteracji: `html[data-theme='dark'] { --color-background: ... }` w `tailwind.css`.
2. **`admin-overrides.scss` import zmienia kolory globalnie**: To zamierzone — brand kolory mają iść na cały admin. Nie traktować zmiany kolorów w Versions/API/listach jako regresji.
3. **`npx shadcn@latest` może nie działać z Tailwind v4**: Jeśli CLI wygeneruje v3 syntax — kopiować ręcznie z `src/components/ui/`.
4. **BlocksField**: Jest w osobnym pliku — nie migrujemy jego layoutu w tym zadaniu, tylko wymieniamy komponenty UI (Button, Dialog) gdy PagesEditView je renderuje.
