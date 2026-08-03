# Shopify-like Topbar i panel edycji — implementacja

> Status: **zrealizowane** (2026-08-03).
> Źródło speca: `docs/shopify-like/spec.md`.
> Wszystkie zmiany w forku SDK (`packages/chaibuilder-sdk/`) + aplikacja.

## 1. Cel

Przebudowa górnego paska (topbar) edytora na układ wzorowany na Shopify: tryby lewego
panelu sterowane ikonami z topbaru, wybór strony pośrodku, akcje globalne po prawej.
Dodatkowo poprawka pozycjonowania dolnego panelu edycji bloku (widoczne ~3 wiersze drzewa,
wybrany element pośrodku).

## 2. Decyzje użytkownika (2026-08-03)

1. **Breakpoints + ScalePercent** zostają w topbarze, ale **po lewej stronie** selecta stron (środkowa strefa).
2. Tryb **„Ustawienia szablonu"** pokazuje **tylko ThemeTab (kolory/typografia)** — bez pełnego `TemplateSettings`.
3. Przycisk powrotu do dashboardu → **konkretny URL** `/dashboard` (przez nowy prop `getBackUrl`).

## 3. Nowy układ topbaru

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← | Layers ⚙ SEO     Breakpoints Scale% |  [Strona ▼ 🔍 +]              │
│  (tryby lewego panelu)         (środek: page selector + search + "+")   │
│                                   ...   🤖 📱 ↩→ ...  Zapisz  Publikuj   │
└───────────────────────────────────────────────────────────────────────────┘
   lewa strona                 środek                        prawa strona
```

| Strefa | Elementy (od lewej do prawej) | Plik |
|---|---|---|
| **Lewa** | `←` powrót do dashboardu, `Layers` (Sekcje), `⚙` (Ustawienia szablonu, ⌘⇧2), `SEO` | `topbar-mode-switcher.tsx` |
| **Środek** | `Breakpoints` + `ScalePercent` + separator + **PageSelector** (dropdown z wyszukiwarką i „+") | `page-selector-in-header.tsx` |
| **Prawa** | `AiAssistant`, `DevicePreview` (desktop/mobile), `UndoRedo`, „..." (overflow), `SaveStateLabel`, `PublishButton` | `builder-top-bar.tsx` |

Zmiany względem starego topbaru:
- Usunięte: `TopbarLeft` (language switcher), `PagesManagerTrigger` (folder), `PageDropdownInHeader`,
  `PreviewButton` (zastąpiony przez `DevicePreview`).
- `Breakpoints`/`ScalePercent` przeniesione ze strefy środkowej na lewo od selecta stron.

## 4. Zmienione pliki

### SDK (`packages/chaibuilder-sdk/`)

| Plik | Zmiana |
|---|---|
| `src/hooks/use-theme.ts` | Nowy atom `leftPanelModeAtom` + hook `useLeftPanelMode()` (typ `"sections" \| "template-settings" \| "seo"`). |
| `src/pages/client/components/topbar-mode-switcher.tsx` | **Nowy** — back arrow + 3 ikony trybów (tabs, jedna aktywna), skrót ⌘⇧2. |
| `src/pages/client/components/seo-icon.tsx` | **Nowy** — współdzielona ikona SEO (SVG). |
| `src/pages/client/components/page-selector-in-header.tsx` | **Nowy** — dropdown wyboru strony z wyszukiwarką i przyciskiem „+" (modal `AddNewPage`). |
| `src/core/components/canvas/topbar/device-preview.tsx` | **Nowy** — przełącznik desktop (1440px) / mobile (375px) przez `canvasDisplayWidthAtom`. |
| `src/pages/client/layouts/topbar/builder-top-bar.tsx` | Przebudowa layoutu wg tabeli z §3. |
| `src/pages/client/layouts/left-panel/builder-left-panel.tsx` | Renderowanie lewego panelu wg `leftPanelModeAtom`; dolny panel edycji bloku wąski (`calc(100% - 96px)`) + `scrollIntoView({ block: "center" })`. |
| `src/pages/client/layouts/left-panel/seo-left-panel.tsx` | **Nowy** — wrapper renderujący `SeoPanel` inline (bez modala). |
| `src/pages/client/layouts/left-panel/sections-tab.tsx` | Usunięte: wyszukiwarka bloków, przycisk „Wygeneruj sekcję z opisu". Zostało drzewo + „+ dodaj sekcję". |
| `src/pages/client/components/seo-panel.tsx` | Props `inline` + `onCancel` (przycisk anulowania w lewym panelu cofa do trybu Sekcje). |
| `src/types/common.ts`, `src/pages/chaibuilder-pages.tsx` | Nowy prop `getBackUrl` (forward do `pagesPropsAtom`). |
| `src/core/locales/en.json` | Nowe klucze: `Add new page`, `Back to dashboard`, `Select page`, `No pages found`, `Desktop preview`, `Mobile preview`. |

### Aplikacja (`src/`)

| Plik | Zmiana |
|---|---|
| `src/app/(builder)/editor/editor.tsx` | Przekazuje `getBackUrl="/dashboard"`. |
| `src/app/(builder)/editor/pl.json` | Polskie tłumaczenia nowych kluczy. |

## 5. Pozycjonowanie panelu edycji bloku (spec §2)

Po kliknięciu bloku w drzewie sekcji:

1. Drzewo przewija się tak, by wybrany element znalazł się na środku widoku
   (`[data-node-id]` → `scrollIntoView({ block: "center", behavior: "smooth" })`).
   Używamy DOM zamiast `treeRefAtom`, bo drzewo to wiele instancji `SectionTree` (per grupa)
   dzielących jeden ref — `scrollTo` z react-arborist nie trafiłby w element z innej grupy.
2. Dolny panel edycji przyjmuje wysokość `calc(100% - 96px)` (≈3 wiersze × 25px + nagłówek),
   dzięki czemu widać ~3 elementy drzewa z wybranym pośrodku.
3. Po odznaczeniu bloku panel wraca do `45%` (ustawienia strony/szablonu) lub znika.

W trybie **SEO** dolny panel jest zawsze ukryty — formularz SEO zajmuje cały lewy panel.

## 6. Uwagi / odchyłki

- `PageSelector` grupuje strony po `pageType` (nazwa typu jako nagłówek), wyszukiwarka filtruje po
  nazwie i slugu; kliknięcie nawiguje przez `useChangePage` (zachowuje parametr `lang`).
- Stary `SeoButton`/modal SEO (sidebar panel `seo`) zostaje — to alternatywny punkt wejścia;
  tryb topbarowy renderuje ten sam formularz inline (`data-panel-id="seo"` zachowuje ochronę
  przed utratą zmian przy zmianie języka).
- `PreviewButton` nadal istnieje w `topbar-right.tsx` i jest używany przez `mobile-menu.tsx` —
  nie usunięto go z eksportu.
- Zakładka „Strony" (PagesTab) zniknęła z lewego panelu desktop; nadal działa w
  `mobile-bottom-sheet.tsx`.

## 7. Weryfikacja

- `pnpm --filter @chaibuilder/sdk build` — OK.
- `pnpm --filter @chaibuilder/sdk test` — 603 ✅ (bez regresji).
- Root `npm run typecheck` — brak nowych błędów (istniejące porażki w `e2e/*` i `admin-preview.test.ts` to stan sprzed zmian).
- `i18n.test.ts` — 12 ✅.
- `graphify update .` — graf zaktualizowany.
