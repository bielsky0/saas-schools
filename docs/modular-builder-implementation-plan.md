# Plan implementacji: Modułowy Kreator Stron (wersja rozszerzona)

> **Status:** **Faza 1 zakończona** (2026-08-15, commit `109b6ad7`). **Faza 2 — w trakcie** (2026-08-15).
> Źródło speca: *"Specyfikacja Funkcjonalna UI/UX – Modułowy Kreator Stron (wersja rozszerzona)"* (Shopify Online Store 2.0, block-based editing).
>
> **Korekta architektoniczna (2026-08-15):** edytor używa **dolnego panelu wysuwanego wewnątrz lewego panelu** (`leftPanelBottomAtom`/`useLeftPanelBottom()`, stany `block|page|template|theme|null`), **nie** prawego panelu (`rightPanelAtom` jest martwym kodem — tylko definicja w `use-theme.ts:65`). Sekcje §3.4 i pliki z §1.2 zostały zaktualizowane pod rzeczywisty kod. Nagłówek z przyciskiem powrotu istnieje w `builder-left-panel.tsx:171-186` (`handleBack`).

---

## 0. Kontekst decyzyjny (potwierdzone decyzje)

| Obszar | Decyzja |
|---|---|
| **Canvas** | Zostaje obecny model **inline canvas** ChaiBuilder (lokalny iframe z izolacją CSS). **Nie** wdrażamy iframe ładującego prawdziwą stronę + `postMessage`/`oseid` (spec §2.2.4, §9.3, §12.3). |
| **Lokalizacja kodu** | Rozbudowa **forka SDK** (`packages/chaibuilder-sdk/src/pages/client/`). |
| **System komponentów** | Wygląd Shopify **replikowany na shadcn/ui + Radix + Tailwind v4** (bez adopcji `@shopify/polaris`). |
| **Zarządzanie stanem** | **Jotai** (atomy zostają; bez Redux/MobX/Zustand). |
| **Global Sidebar 44px** (§2.2.2) | **Zostajemy przy trybach w topbarze.** Rail 44px odroczony (wariant alternatywny ze speca). |
| **Tokeny komponentowe** (§7.1) | **Osobne CSS vars** w `shopify-tokens.css`, **bez rozszerzania `ChaiTheme`** (mniej inwazyjne, mniejsze ryzyko regresji `chai-theme-helpers.ts`). |

**Poza zakresem (na stałe lub odroczone):** rail 44px, iframe z realną stroną + `postMessage`/`oseid`, adopcja Polaris, migracja stanu na Redux/MobX, rozszerzenie `ChaiTheme` o tokeny komponentowe (możliwe później, gdy będzie stabilne).

---

## 1. Podsumowanie audytu

### 1.1 Co już jest zaimplementowane (mapowanie spec → kod)

| Sekcja speca | Status | Obecna implementacja (fork SDK) |
|---|---|---|
| §2.1 Strefy (topbar / left panel / canvas) | ✅ częściowo | `layouts/builder-layout.tsx`, `layouts/topbar/builder-top-bar.tsx`, `layouts/left-panel/builder-left-panel.tsx` |
| §2.2.1 Top Bar (tryby, selector stron, undo/redo, save) | ✅ | `components/topbar-mode-switcher.tsx`, `page-selector-in-header.tsx`, `device-preview.tsx` |
| §2.2.2 Global Sidebar (44px rail) | ⚠️ odchylenie | Tryby w **topbarze** (decyzja: zostaje), rail pominięty |
| §2.2.3 Contextual Sidebar (sticky header + scroll) | ✅ | `left-panel/builder-left-panel.tsx` renderuje wg `leftPanelModeAtom` |
| §3.1 / §3.2 core workflow | ✅ | klik→selekcja, edycja w prawym panelu, zapis autosave |
| §3.3 Drag & Drop | ⚠️ częściowo | `react-arborist` w `section-tree.tsx`; wskaźnik drop = zielone tło (`node.tsx:268`), **nie** niebieska linia 2px |
| §4.1 Drzewo + grupy (Nagłówek/Szablon/Stopka) | ✅ | `left-panel/section-groups.ts`, `section-tree.tsx` |
| §4.1 Ikony hover (oko/kosz/uchwyt) | ⚠️ częściowo | `node.tsx` ma oko + `⋯` (BlockMoreOptions); brak uchwytu 6-kropek i bezpośredniego kosza |
| §4.2 Stany elementu | ⚠️ kolorystyka | selected = `bg-primary/20` (nie jednolite niebieskie tło + biały tekst) |
| §5.1 Drill-down + przycisk powrotu | ⚠️ częściowo | selekcja otwiera prawy panel; brak "‹ Struktura" w headerze |
| §5.2 Kontrolki (slider/segmented/color/toggle) | ✅ | `core/rjsf-widgets/`, `theme/token-editors/*`, `components/ui/*` (shadcn) |
| §6 Dodawanie sekcji (popover + biblioteka) | ⚠️ częściowo | `AddSectionDialog` (pełny modal) + `AddBlocksPanel` (tabs Blocks/Library/Partials/Import, grid, search); **brak** zakładek wg roli i hover-preview |
| §7.1 Ustawienia motywu (akordeony) | ⚠️ częściowo | `theme/theme-groups.ts` (9 grup), edytory: kolory/typografia/zaokrąglenia; **6 placeholderów** |
| §7.2 Page Switcher | ✅ | `page-selector-in-header.tsx`, `pages-tab.tsx`, `page-groups.ts` |
| §9.1 Model danych (Section/Page/Theme) | ✅ | `types/common.ts`, `atoms/blocks` (`treeDSBlocks`) |
| §9.2 Undo/Redo 50 kroków | ✅ | `hooks/history/use-undo-manager.ts` → `undoManager.setLimit(50)` |
| §9.3 postMessage | ➖ poza zakresem | — |
| §11 WCAG | ⚠️ częściowo | react-arborist ma keyboard; `aria-label` obecne; **brak** skip-link, audyt `aria-pressed`/`aria-live` |
| §10 Wydajność | ✅ częściowo | react-arborist (virtual), lazy panel |

### 1.2 Kluczowe pliki (punkt zaczepienia)

> **Aktualizacja (2026-08-15):** panele `right-panel/*` zostały zastąpione przez **dolny slide-up panel** w lewym panelu (`builder-left-panel.tsx`). `empty-right-panel.tsx`, `page-settings.tsx`, `template-settings.tsx` są dalej renderowane, ale **wewnątrz dolnej sekcji lewego panelu**, sterowane przez `useLeftPanelBottom()`.

```
packages/chaibuilder-sdk/src/
  pages/client/layouts/
    builder-layout.tsx          # routing stref (left panel / canvas / AI panel)
    left-panel/
      builder-left-panel.tsx    # render wg leftPanelModeAtom; dolny slide-up panel wg leftPanelBottomAtom
      sections-tab.tsx          # drzewo + AddSectionDialog + GenerateSectionDialog
      section-tree.tsx          # wrapper react-arborist (osobna instancja per grupa)
      section-groups.ts         # grupowanie wg roli z section-catalog (Faza 1)
      section-catalog.ts        # katalog sekcji (Faza 1)
      section-preview.tsx       # hover-preview (Faza 1)
      theme-tab.tsx / pages-tab.tsx / seo-left-panel.tsx
    tokens/
      shopify-tokens.css        # tokeny chrome + komponentowe --cmp-* (Faza 1)
    right-panel/
      page-settings.tsx / template-settings.tsx / empty-right-panel.tsx   # renderowane w dolnym panelu
    theme/
      theme-groups.ts / theme-editor.tsx / use-theme-editor.tsx / token-editors/*
  core/components/sidepanels/panels/
    outline/node.tsx            # węzeł drzewa (hover icons, drop indicator)
    outline/default-cursor.tsx  # kursor drop (zielony 1px → niebieski 2px w Fazie 2)
    outline/block-more-options.tsx # menu "⋯" (duplikuj/zmień nazwę/usuń)
    add-blocks/add-blocks.tsx   # biblioteka bloków
  hooks/history/use-undo-manager.ts   # limit 50 ✅
  hooks/use-key-event-watcher.ts      # Ctrl+Z/Ctrl+Y/copy/paste/del (Faza 2 rozszerza o Ctrl+Shift+Z, Ctrl+S)
  hooks/use-save-page.ts              # savePageAsync → mapowanie Ctrl+S
  hooks/use-remove-blocks.ts          # usunięcie bloków (reużycie w dialogu kosza, Faza 2)
  core/components/canvas/static/static-canvas.tsx  # lokalny iframe
```

### 1.3 Najważniejsze luki (Gap Analysis)

> **Status po Fazie 1 + wstęp do Fazy 2 (2026-08-15):** punkty 1–3 to zakres Fazy 2; punkt 4 częściowo domknięty (hover-preview z Fazy 1, brak zakładek); punkty 5–6 → Fazy 3–4; punkt 7 rozstrzygnięty.

1. **Wskaźnik drop jest zielony** (linia 1px + kropka w `default-cursor.tsx`), spec chce niebieskiej linii 2px z okrągłymi końcami; brak stanu czerwonego przy niedozwolonym dropie — §3.3, §8.5. **→ Faza 2, zad. 2.1.**
2. **Brak bezpośredniego kosza** na hover węzła (usunięcie jest w menu "⋯" przez `useRemoveBlocks`, bez dialogu potwierdzenia) + **brak uchwytu 6-kropek** (dragHandle jest na całym wierszu) — §4.1. **→ Faza 2, zad. 2.2.**
3. **Kolorystyka stanów** (aktywny = jednolite niebieskie tło + biały tekst) — §4.2, §8. **→ Faza 2, zad. 2.3.**
4. **Biblioteka sekcji bez zakładek wg roli** (Wszystkie/Hero/Cennik/Formularze/Referencje/Stopki) — §6.2–6.3; hover-preview **dodane w Fazie 1**. **→ Faza 3.**
5. **6 placeholderów motywu** (spacing-width, buttons, form-fields, course-cards, logo-favicon, icons) — §7.1. **→ Faza 3.**
6. **WCAG**: skip-link, `aria-pressed` (✅ zrobione w `topbar-mode-switcher.tsx`), `aria-expanded`/`aria-live`, audyt kontrastu — §11. **→ Faza 2 (skip-link) + Faza 4.**
7. **Odchylenie architektoniczne**: pionowy rail 44px — rozstrzygnięte (zostać przy topbarze).

---

## 2. Faza 1 — Fundamenty (design tokens, rejestr sekcji)

> Fundamenty techniczne **już istnieją** (fork SDK, atomy, i18n PL/EN, undo 50, render engine, autosave). Faza 1 domyka elementy "podstawowe" dla Faz 2–3.

### 2.1 Normalizacja design tokenów do "Shopify look" na shadcn

**Pliki:** nowy `pages/client/layouts/tokens/shopify-tokens.css` (+ rozszerzenie `default-theme-options.ts`).

Dwie warstwy tokenów w `shopify-tokens.css`:

**(a) Tokeny "chrome" edytora:**
- `--chai-surface` (#fff), `--chai-surface-subdued` (#f6f6f7), `--chai-hover` (#f0f0f1),
- `--chai-accent` (#006bff / `primary`), `--chai-success` (#34a853),
- `--chai-text` (#1a1a1a), `--chai-text-subdued` (#6b6b7a).
- Geometria: `radius` 8px karty / 4px przyciski / 12px modale; skala odstępów 4/8/12/16/24/32.
- Typografia: nagłówki paneli 16px/600, etykiety 13px/500, wartości 14px/400.

**(b) Tokeny komponentowe** (osobne CSS vars — **nie** w `ChaiTheme`):
- `--cmp-btn-radius`, `--cmp-btn-padding`, `--cmp-field-radius`, `--cmp-field-padding`,
- `--cmp-card-radius`, `--cmp-card-padding`, `--cmp-heading-size`, `--cmp-body-size`, … — dane wejściowe dla edytorów motywu (Faza 3, §4.2).

**AC:** komponenty `Button`/`Input`/`Badge`/`Tabs`/`Tooltip` używają nowych tokenów; spójność z referencyjnymi zrzutami Shopify (`docs/shopify-like/`); tokeny komponentowe nie są częścią `ChaiTheme` (brak zmian w `getChaiThemeCssVariables`).

### 2.2 Rejestr typów sekcji + katalog metadanych

**Nowe pliki:**
- `packages/chaibuilder-sdk/src/types/section-catalog.ts` — interfejsy.
- `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/section-catalog.ts` — implementacja katalogu.

```ts
// types/section-catalog.ts
export type SectionRole = "header" | "template" | "footer";
export type SectionCategory =
  | "all" | "hero" | "pricing" | "forms" | "testimonials" | "footers" | "cards" | "media";

export interface SectionCatalogEntry {
  type: string;                 // _type bloku, np. "Hero", "GroupTypeCard"
  labelKey: string;             // klucz i18n
  category: SectionCategory;
  role: SectionRole;            // do grupowania Nagłówek/Szablon/Stopka
  descriptionKey?: string;
  thumbnail?: string | "auto";  // "auto" = miniatura renderowana z domyślnych props
}

export interface SectionCatalog {
  getByCategory(cat: SectionCategory): SectionCatalogEntry[];
  getByType(type: string): SectionCatalogEntry | undefined;
  search(query: string): SectionCatalogEntry[];
}
```

- `section-groups.ts`: `SECTION_GROUP_RULES` czerpie role z katalogu (fallback: obecna heurystyka po `_type`/`_name`).
- Rejestracja bloków app: `GroupTypeCard`→`cards`, `UpcomingEvents`→`template`, `BookingButton`→`template`, `InstructorCard`→`cards`, blog→`template` (w `src/lib/blocks-library.ts` lub nowy `src/lib/section-catalog.ts`, wstrzykiwany przez prop).

**AC:** `SectionCatalog` jednostkowo testowalny (vitest); `groupSections` używa katalogu; brak regresji w 7 istniejących testach `section-groups.test.ts`.

### 2.3 Mechanizm hover-preview (miniaturka sekcji)

**Nowy plik:** `pages/client/layouts/left-panel/section-preview.tsx`.

- Render **lekkiego podglądu** bloku z domyślnych props (`getBlockDefaultProps(type)`) w `<div>` 240×320 z `pointer-events-none`, osadzony w `HoverCard`/`Tooltip` shadcn.
- Reużycie `BlockRenderer` z `render/` (render-only, bez edycji) albo statyczny thumbnail SVG dla prostych sekcji.

**AC:** hover na kartę → powiększony podgląd bez wpływu na stan; memoizacja (O(1) na hover).

### 2.4 Global Sidebar 44px — ROZSTRZYGNIĘTE

**Decyzja:** zostajemy przy trybach w topbarze. Rail 44px pominięty (wariant odroczony). Ewentualna notatka w docs: §2.2.2 to alternatywny układ do wdrożenia tylko w razie potrzeby.

### Zależności Fazy 1
- 2.2 (katalog) → warunek dla 2.3 (hover-preview) i Fazy 3 (§6).
- 2.1 (tokeny) → warunek dla kolorystyki stanów w Fazie 2 i edytorów komponentowych w Fazie 3.

**Szacunek: 5–6 man-days.**

---

## 3. Faza 2 — Rdzeń interakcji (DnD, nawigacja panelu)

> **Korekta architektoniczna (2026-08-15):** sekcje 3.4/3.5 aktualizowane pod **dolny slide-up panel** w lewym panelu (`useLeftPanelBottom()`), nie pod `rightPanelAtom`. Część zadań jest już częściowo gotowa (back-button, `aria-pressed`, Ctrl+Z/Ctrl+Y) — oznaczono ✅.

### 3.1 Wskaźnik drop target — niebieska linia 2px

> **Korekta po audycie:** `DefaultCursor` już istnieje (`core/components/sidepanels/panels/outline/default-cursor.tsx`) i jest podpięty przez `renderCursor={DefaultCursor}` w `section-tree.tsx:224`. Zadanie to **restyle istniejącego kursora**, nie budowa od zera.

**Plik:** `core/components/sidepanels/panels/outline/default-cursor.tsx` (współdzielony z `list-tree.tsx` — zmiana dotknie oba drzewa, co jest pożądane).

- Kursor: niebieska linia `h-[2px] bg-primary` z okrągłymi końcami (kropki `before:`/`after:`), zamiast zielonej `h-[1px] border-green-500` + kropki.
- Stan niedozwolony: `disableDrop` już blokuje drop (300ms debounce w `section-tree.tsx:114`), ale **brak wizualnego stanu czerwonego**. `CursorProps` react-arborist nie niesie informacji o walidacji — dodać atom `dropCursorInvalidAtom` (Jotai), ustawiany wewnątrz `debouncedDisableDrop` w `section-tree.tsx`, czytany w `DefaultCursor` → czerwona linia.
- **Uwaga:** drugi wskaźnik drop — zielone tło `bg-green-200` na węźle rodzica (`node.tsx:268`, `willReceiveDrop`) — wyrównać do nowej konwencji (niebieski tint lub usunięcie zielonego).

**AC:** przeciąganie **w obrębie grupy** (Nagłówek / Szablon / Stopka — osobno) pokazuje niebieską linię; niedozwolony target → czerwony + blokada (już działa przez `disableDrop`); drop nie dotyka canvasu (wyłącznie panel). E2E smoke DnD.

> **Decyzja (2026-08-15):** **pomijamy cross-group DnD.** Nagłówek i Stopka mają osobne, dedykowane bloki — przenoszenie między grupami nie jest potrzebne. DnD działa **wyłącznie wewnątrz grup** i tak zostaje (osobna instancja `SectionTree` per grupa). Brak refaktoru na jedno drzewo (§3.1b usunięty).

### 3.2 Uchwyt 6-kropek + ikony (oko / kosz) na hover

**Pliki:** `core/components/sidepanels/panels/outline/node.tsx` + nowy `drag-handle.tsx` + nowy `confirm-delete-section-dialog.tsx`.

- `DragHandle` (6 kropek, SVG) po lewej, `opacity-0 group-hover:opacity-100`.
- **Uwaga (dragHandle):** obecnie `ref={dragHandle}` siedzi na całym wierszu (`node.tsx:211`). Przeniesienie na mały uchwyt zmienia UX (chwyt trzeba trafić w 6 kropek) — wymaga weryfikacji w react-arborist 3.4.3, czy `dragHandle` przyjęty na pod-element nie psuje `onDragStart`/`willReceiveDrop` wiersza. **Traktować jako spike:** jeśli łamie DnD, zostawić drag na całym wierszu, uchwyt 6-kropek jako wskaźnik wizualny.
- **Reużycie zamiast duplikacji:** kosz wywołuje istniejący `useRemoveBlocks` (gated `PERMISSIONS.DELETE_BLOCK`) — **ale** obecnie usunięcie jest natychmiastowe, bez potwierdzenia. Dodać `confirm-delete-section-dialog.tsx` (`AlertDialog` shadcn, wzorzec: `delete-page.tsx`/`clear-canvas.tsx`) wokół tego samego hooka. Zostaje `BlockMoreOptions` ("⋯" — duplikuj/zmień nazwę/usuń).
- **Ryzyko #8:** `use-remove-blocks.ts:87` czyści selekcję po 200ms (`setTimeout`) — w dialogu potwierdzenia trzymać `ids` bloków przed wywołaniem `useRemoveBlocks`, nie polegać na selekcji.

**AC:** hover ujawnia 6-kropek + oko + kosz; kosz otwiera dialog potwierdzenia; usunięcie przez `useRemoveBlocks` (wchodzi do historii undo przez `setNewBlocks`); permission gate zachowany.

### 3.3 Kolorystyka stanów elementu (spec §4.2, §8.5)

**Plik:** `node.tsx`.

- Aktywny (selected): `bg-primary/20` → `bg-primary text-white` (jednolite), ikony/tekst białe.
- Hover (niezaznaczony): `hover:bg-gray-100` → `hover:bg-[#f0f0f1]`.
- Przeciągany: `opacity-20` → `opacity-50` (obecnie `opacity-20`).
- Drop target: obsłużony w 3.1.
- `aria-current`/`aria-selected` zsynchronizowane z `node.isSelected`.

**AC:** kontrast WCAG ≥4.5:1 dla tekstu na `primary`; stany pokryte testem snapshot/visual.

### 3.4 Drill-down: przycisk powrotu "‹ Struktura"

> **Korekta (2026-08-15):** nie ma już prawego panelu. Back-button **istnieje** w nagłówku dolnego panelu — `builder-left-panel.tsx:171-186` (`handleBack` ustawia `setBlockIds([])` + `setBottomPanel(null)`).

**Plik:** `pages/client/layouts/left-panel/builder-left-panel.tsx` (nagłówek dolnego panelu).

- Rozszerzyć nagłówek o tekstową etykietę breadcrumb: dla bloku `‹ Struktura`, dla edytora motywu `‹ Motyw` (obok istniejącej `ArrowLeft`).
- Po powrocie: fokus wraca do zaznaczonego węzła drzewa (a11y) — uzupełnić o `focus()` na `[data-node-id]`.
- Zachować auto-powrót przy kliknięciu w drzewo (istniejący efekt w `builder-left-panel.tsx`).

**AC:** powrót nie zapisuje (zapis tylko przez autosave/Zapisz); fokus wraca do wybranego węzła (a11y).

### 3.5 Klawiatura + focus management (część §11)

> **Korekta (2026-08-15):** obsługa klawiatury jest w `hooks/use-key-event-watcher.ts` (nie w `keyboar-handler.tsx`). ✅ już jest: `Ctrl+Z` undo, `Ctrl+Y` redo, cut/copy/paste, `Del`/`Backspace` (przez `useRemoveBlocks`), `Esc`, `Ctrl+D` duplicate; `aria-pressed` na przyciskach trybów (`topbar-mode-switcher.tsx:70`).

**Pliki:** `hooks/use-key-event-watcher.ts` (rozszerzyć), `builder-layout.tsx` (skip-link).

- Dodać: `Ctrl+Shift+Z` redo (obok istniejącego `Ctrl+Y`), `Ctrl+S` zapis (`preventDefault` + `savePageAsync()` z `hooks/use-save-page.ts`).
- Skip-link "Przejdź do edycji sekcji" (`sr-only focus:not-sr-only`) jako pierwszy focusowalny element w `builder-layout.tsx`.
- `aria-expanded` na akordeonach motywu → odroczone do Fazy 3 (edytory tokenów), tu tylko TODO.

**AC:** Tab pokrywa topbar → left panel → canvas; skip-link pomija iframe; testy a11y (axe) w Fazie 4.

### Zależności Fazy 2
- 3.1 wymaga 2.2 (katalog → walidacja `canAcceptChildBlock`); faktyczna walidacja idzie przez istniejący `canAcceptChildBlock` w `block-helpers.ts`.
- 3.4 wymaga istniejącego modelu `leftPanelBottomAtom` (`use-theme.ts:77`).
- 3.3 wymaga tokenów z 2.1.

**Szacunek: 10–12 man-days** (bez cross-group DnD). Przy realizacji wg korekty architektonicznej i częściowo gotowych elementach: **~7–9 man-days** (2.2 spike react-arborist ≈ 3 dni).

---

## 4. Faza 3 — Edycja treści (formularze, biblioteka sekcji, motyw)

### 4.1 Biblioteka sekcji: popover + zakładki wg roli (§6)

**Pliki:**
- `sections-tab.tsx`: `AddSectionDialog` z pełnego `Dialog` → **popover z prawej krawędzi** (shadcn `Sheet` side="right" lub `Popover`), nakładający się na canvas, częściowo przezroczysty (`bg-background/95`).
- Nowy `left-panel/section-library.tsx` — zakładki `SectionCategory` (`Wszystkie`, `Hero`, `Cennik`, `Formularze`, `Referencje`, `Stopki`, `Karty`) + wyszukiwarka (`cmdk` — już w deps) filtrująca przez `SectionCatalog.search`.
- Karty: nazwa + miniatura + opis (`SectionCatalogEntry`), podpięcie `section-preview.tsx` (hover-preview z 2.3).
- Klik → `addBlocks([...defaultProps(type)])` na zaznaczonej pozycji (lub koniec), zamknięcie popoveru, odświeżenie podglądu.

**AC:** kategorie filtrują; search realtime; hover pokazuje powiększony podgląd; dodanie wstawia w zaznaczone miejsce; popover nie zasłania całego canvasu.

### 4.2 Uzupełnienie placeholderów motywu (§7.1) — tokeny komponentowe jako CSS vars

**Pliki:** `theme/token-editors/*` (nowe) + aktualizacja `theme-groups.ts`.

- Zmiana `kind` z `placeholder` na `editor` + edytor:
  - `spacing-width.tsx` — szerokość kontenera (max-width) + skala odstępów (slidery) → istniejące vars kontenera.
  - `buttons.tsx`, `form-fields.tsx`, `course-cards.tsx` — edycja **tokenów komponentowych** (`--cmp-*` z §2.1) przez nowy atom `componentTokensAtom` + `useSaveWebsiteData({ type: "THEME" })`. **Bez zmian w `ChaiTheme`.**
  - `logo-favicon.tsx` — reużycie `ImagePicker`/digital-asset-manager, zapis do `websiteConfig`.
  - `icons.tsx` — selektor zestawu ikon (placeholder do czasu zasobu).
- Kategorie speca §7.1 (Logo/Favicon, Paleta, Typografia, Strona, Animacje, Badges, Przyciski, Koszyk, Szuflady, Ikony, Pola, Modale, Ceny, Karty, Wyszukiwanie, Swatche, Selektory, Custom CSS) — zamapować na istniejące 3 sekcje/9 grup lub rozszerzyć `THEME_GROUPS`. **Rekomendacja: rozszerzyć listę grup** do pełnego zestawu speca, z `kind: editor|placeholder` dla nieobsługiwanych.

**AC:** każda realna grupa zapisuje przez `debouncedSaveTheme()`/`useSaveWebsiteData({type:"THEME"})`; live preview przez `<style id="chai-theme">` (chrome) i vars `--cmp-*`; placeholdery oznaczone "Wkrótce"; `theme-groups.test.ts` rozszerzony.

### 4.3 Edycja bloków wewnętrznych (podbloki) — weryfikacja drill-down

**Pliki:** `SettingsPanel` (`core/components/settings/settings-panel.tsx`, 3 zakładki Treść/Styl/Zaawansowane — istnieją) + dolny panel (`builder-left-panel.tsx`).

- Weryfikacja drill-down do podbloków (karty w sekcji) — klik węzła wewnętrznego otwiera jego `SettingsPanel`; nawigacja wstecz przez 3.4.
- Dodać listę podbloków z DnD na dole `SettingsPanel` (jeśli brak) — reużycie `SectionTree` dla `children`.

**AC:** edycja zagnieżdżona działa; back wraca poziom wyżej; podbloki można przestawiać.

### 4.4 Optymalizacja debounce dla sliderów (§3.2 krok 5)

**Pliki:** `core/rjsf-widgets/slider.tsx`, `theme/token-editors/*`.

- Ujednolicić debounce **200 ms** dla sliderów (zweryfikować obecny); wartości numeryczne z możliwością ręcznego wpisu.

**AC:** ciągłe przesuwanie suwaka nie wywołuje zapisu per-klatkę; podgląd aktualizuje się płynnie (~60fps).

### Zależności Fazy 3
- 4.1 wymaga 2.2 + 2.3.
- 4.2 wymaga tokenów `--cmp-*` z 2.1.
- 4.3 wymaga 3.4 (back).

**Szacunek: 12–14 man-days** (korekta po decyzji o tokenach CSS vars — mniejsze ryzyko regresji `ChaiTheme`; + wstrzyknięcie `--cmp-*` na stronie publicznej).

---

## 5. Faza 4 — Dopracowanie (wydajność, dostępność, testy E2E)

### 5.1 Dostępność WCAG 2.1 AA (§11)

**Pliki:** cały `layouts/` + `components/ui/*`.

- Audyt automatyczny `@axe-core/playwright` (dodać do `playwright.config.ts`).
- Uzupełnić: `aria-pressed`/`aria-expanded`/`aria-live="assertive"` (toasty `sonner` już mają `aria-live`), `aria-label` dla ikon, `role="tree"`/`aria-level` w drzewie.
- Kontrast: automatyczny test tokenów (wzorzec istniejącego `hooks/theme-contrast.test.ts`).

**AC:** raport axe bez "critical/serious"; nawigacja klawiszowa pełna; powiększenie 200% nie łamie layoutu.

### 5.2 Wydajność (§10)

**Pliki:** `section-tree.tsx`, `theme-tab.tsx`, `AddBlocksPanel`.

- Wirtualizacja: react-arborist już wirtualizuje drzewo; dodać wirtualizację listy grup motywu (jeśli >50).
- Lazy loading edytorów motywu (`React.lazy`/`dynamic`) po rozwinięciu grupy.
- Memoizacja: `useMemo` na katalogu sekcji i `section-preview`.

**AC:** profil renderu panelu <16 ms przy 200 sekcjach; brak zbędnych re-renderów (React DevTools profiler).

### 5.3 Testy

**Pliki (nowe testy):**
- SDK vitest: `section-catalog.test.ts`, `drop-cursor.test.ts` (walidacja), `section-preview.test.ts`, rozszerzone `theme-groups.test.ts`.
- App Playwright: `editor-dnd.spec.ts`, `editor-a11y.spec.ts`, rozszerzenie `editor-smoke.spec.ts`, `mobile-editor.spec.ts`.

**AC:** `pnpm --filter @chaibuilder/sdk test` zielone (603+ nowe); `pnpm test:e2e` przechodzi na środowisku z bazą.

### 5.4 Dokumentacja i regresja

- Zaktualizować `docs/architecture/chaibuilder-cms.md` (nowe komponenty, katalog sekcji, tokeny).
- `graphify update .` po zmianach.
- Regresja: autosave, publish/unpublish, page-lock, i18n, SEO modal, dark mode.

**AC:** zero regresji w istniejących 603 testach SDK i e2e; docs zaktualizowane.

### Zależności Fazy 4
- 5.1–5.3 wymagają zakończenia Faz 2–3.

**Szacunek: 8–10 man-days.**

---

## 6. Oszacowanie czasu (man-days)

| Faza | Zakres | Man-days |
|---|---|---|
| **Faza 1 — Fundamenty** | tokeny (chrome + komponentowe), katalog sekcji, hover-preview — **✅ ukończone** | 5–6 |
| **Faza 2 — Rdzeń interakcji** | drop line, uchwyty, stany, drill-down back, klawiatura (DnD tylko wewnątrz grup) | 10–12 *(7–9 przy częściowo gotowych elementach)* |
| **Faza 3 — Edycja treści** | biblioteka sekcji (popover+tabs), motyw placeholders, podbloki, debounce, **`--cmp-*` na stronie publicznej** | 12–14 |
| **Faza 4 — Dopracowanie** | WCAG, wydajność, testy, docs | 8–10 |
| **Razem** | | **35–42** |

**Przelicznik:** 1 dev ≈ 7–8 tygodni; 2 dev równolegle (Faza 2 ∥ Faza 3 po Fazie 1) ≈ 4–5 tygodni.

---

## 7. Ryzyka i punkty otwarte

1. **Cross-group DnD** — **rozstrzygnięte**: pominięte (osobne, dedykowane bloki Nagłówka/Stopki). DnD tylko wewnątrz grup.
2. **`ChaiTheme` nie ma tokenów komponentowych** — **rozstrzygnięte**: tokeny `--cmp-*` jako osobne CSS vars w `shopify-tokens.css`. **Uwaga:** vars muszą być wstrzykiwane także na **publicznej stronie** (app-side: `ThemeInjector` + `getBlocksCss`), inaczej edycja tokenów nie odbije się na żywej witrynie — zadanie przekracza granicę SDK/app (śledzić w Fazie 3, nie tylko w SDK).
3. **Build SDK jest wolny** (tsc+vite) — każda zmiana w forku wymaga przebudowy; rozważyć `vite build --watch` w Fazie 1.
4. **`dragHandle` na węźle** — przeniesienie z całego wiersza na uchwyt 6-kropek wymaga weryfikacji w react-arborist 3.4.3 (patrz §3.2).
5. **Kategorie speca §6.2 (Hero/Cennik/...) vs role domenowe** — bloki app to `GroupTypeCard`/`InstructorCard`/`BookingButton`/blog. Wymagane mapowanie blok→kategoria (Faza 1, §2.2), nie 1:1 z nazwami Shopify.
6. **`DefaultCursor` jest współdzielony** z `list-tree.tsx` (stary layout/demo) — restyle dotknie oba miejsca; upewnić się, że to OK lub rozdzielić kursory.
7. **Brak testów visual/regression dla kolorystyki** — rozważyć Playwright screenshot diff w Fazie 4.
8. **Usunięcie bloku wyczyści selekcję z 200ms `setTimeout`** (`use-remove-blocks.ts:87`) — kruche; w dialogu potwierdzenia trzymać id bloków przed usunięciem.

---

## 8. Poza zakresem (decyzje — świadome pominięcia)

- Rail 44px (Global Sidebar, §2.2.2).
- iframe z realną stroną tenanta + `postMessage`/`oseid`/sandbox (§2.2.4, §9.3, §12.3).
- Adopcja `@shopify/polaris` i `s-internal-icon` Shadow DOM (§12.1–12.2).
- Migracja stanu na Redux/MobX (§9.2) — zostaje Jotai.
- Rozszerzenie `ChaiTheme` o tokeny komponentowe (§7.1) — na razie osobne CSS vars.
