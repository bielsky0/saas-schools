# Plan implementacji: Edytor wg speca (Wireframes buildera.html) wtopiony w ChaiBuilder

> Źródło speca: `docs/Wireframes buildera.html` (widoki t0, t1a/1b, t2a/2b, t3a/3b).
> Każda faza = osobna sesja. Wpisuj postęp/odchyłki przy każdej fazie.

## 1. Cel i zasady

Przebudować UI/UX edytora ChaiBuilder w forku SDK tak, by odpowiadał widokom ze speca (kierunek **t2 → t3**, linia 1b: shadcn/ui, zakładki Sekcje/Motyw/Strony, desktop + mobile). **Cała logika zostaje** (bloki, autozapis, publikacja, motyw, strony, AI) — zmieniamy tylko warstwę widoków i reorganizujemy istniejące komponenty.

**Utrwalone decyzje:**
- Kod UI w forku SDK (`packages/chaibuilder-sdk/src/pages/client/…`), aktywacja przez custom `layout`.
- Tokeny komponentowe (Przyciski/Pola/Karty) i Odstępy/szerokość → **placeholdery** w pierwszej iteracji.
- Grupowanie Nagłówek/Szablon/Stopka → **heurystyka wg typu/nazwy bloku**.
- UI **po polsku, fallback EN** (i18n).

**Cykl pracy:** zmiany w `packages/chaibuilder-sdk/src/` → `pnpm --filter @chaibuilder/sdk build` → `pnpm dev`. Tailwind skanuje `dist/**/*.{js,cjs}`, więc klasy nowych komponentów trafiają do CSS automatycznie.

---

## 2. Architektura wpinania (fundament)

Obecnie `editor.tsx:70` → `ChaiWebsiteBuilder` → `ChaiBuilderInner` (chaibuilder-pages.tsx:96) → `ChaiBuilderEditor` (chaibuilder-editor.tsx:109). `ChaiBuilderEditor` już wspiera `props.layout` (chaibuilder-editor.tsx:110), **ale** `ChaiBuilderInner` **nie forwarduje `layout`**.

### Faza 0.1 — forward `layout` + aktywacja nowego UI
- **Patch** `packages/chaibuilder-sdk/src/pages/chaibuilder-pages.tsx`: dodać `layout` do przekazywanych props do `<ChaiBuilderEditor … layout={props.layout} />` oraz do typu `ChaiWebsiteBuilderProps`.
- Nowy layout: `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` (default dla saas-school) + zachowanie starego `RootLayout` (core/layout/root-layout.tsx) nietkniętego.
- W `editor.tsx` (app): `<ChaiWebsiteBuilder layout={BuilderLayout} … />` (import z nowego subpath exportu).

> **POSTĘP (2026-08-01): ✅ Faza 0.1+0.2 scalone i zrobione.** Decyzja: 0.1 i 0.2 są atomowo sprzężone (subpath export musi istnieć zanim `editor.tsx` go zaimportuje), więc wykonane razem. BuilderLayout wystartował od razu z placeholderem 3 zakładek (Sekcje = `<Outline />`, Motyw/Strony = „wkrótce"). Pliki: `builder-layout.tsx`, entry `src/pages/layout/index.ts`, `vite.config.ts` (entry `layout`), `package.json` (exports `./pages/layout`), forward w `chaibuilder-pages.tsx:186`, `layout` w `Pick<ChaiBuilderEditorProps>` (`types/common.ts`), `editor.tsx` (app) `layout={BuilderLayout}`. **Odchyłka:** ścieżka RootLayout to `core/components/layout/root-layout.tsx` (nie `core/layout/…`). Zweryfikowano: build SDK OK, subpath rozwiązuje się, Playwright smoke przez `{sub}.localtest.me:3000/editor` → zakładki Sekcje/Motyw/Strony renderują się, stary icon-rail zniknął, bez nowych błędów JS. Uwaga: restart dev servera wymagany po zmianie `package.json` exports (Turbopack nie odświeża mapy bez restartu).

### Faza 0.2 — nowy export z SDK
- `package.json` (fork): dodać subpath np. `"./pages/layout": { types: dist/layout.d.ts, import: dist/layout.js, … }`.
- Vite build wielo-entry (`vite.config`) — dołożyć entry `layout` obok istniejących (`pages`, `runtime`, itd.). Zweryfikować w `vite.config.*`.
- Eksport: `BuilderLayout`, ewentualnie składowe (topbar, panele, sheet mobile).

> **POSTĘP (2026-08-01): ✅ zrobione razem z Faza 0.1** (atomowe). `vite.config.ts` entry `layout`, exports `./pages/layout` (`dist/layout.{js,cjs,d.ts}`).

### Faza 0.3 — i18n PL
- SDK ma `~/core/locales/load` + `i18n.addResourceBundle` przez prop `translations`. Dodać bundle PL (`src/app/(builder)/editor/` lub w forku `~/core/locales/pl.json`) z kluczami nowych etykiet: `Sekcje`, `Motyw`, `Strony`, `Treść`, `Styl`, `Zaawansowane`, `Zapisano`, `Podgląd`, `Publikuj`, `Wygeneruj sekcję`, `Aktywny motyw`, `Zmiany motywu dotyczą wszystkich stron`, tokeny itd. Fallback EN dla brakujących.

> **POSTĘP (2026-08-01): ✅ zrobione.** Decyzje: **angielskie klucze** (konwencja en.json: key = EN fraza; refaktor `builder-layout.tsx` z `t("Sekcje")`→`t("Sections")`, `t("Motyw")`→`t("Theme")`, `t("Strony")`→`t("Pages")`, `t("Wkrótce")`→`t("Coming soon")`); **bundle PL w app** (`src/app/(builder)/editor/pl.json`, ~80 kluczy: nowe etykiety + widoczne chrome — nie pełne ~560); **locale z tenanta/subdomeny** — `editor/api` `GET_WEBSITE_DATA` zwraca `uiLocale: "pl"` (domyślny UI tenanta; per-org `locale` w przyszłości — organizacja nie ma jeszcze takiej kolumny), `editor.tsx` przekazuje `locale={uiLocale}` + `translations={{ pl: plTranslations }}` (wzorzec `fr-CA` z `routes/website-builder.tsx:95-97`). Nowe klucze EN dodane do `en.json` (Sections, Pages, Publish, Unpublish, Generate section, Search section or block, Header, Template, Overridden, Content, Manual classes, Active theme, Theme changes apply to all pages). Test `src/app/(builder)/editor/i18n.test.ts` (wzorzec `admin-i18n.test.ts`): klucze builder-layout + nowe UI + chrome w en.json i pl.json, brak pustych wartości PL — 4/4 ✅. Build SDK OK, `dist/layout.js` zawiera `Sections`, en.json zbundlowany. Typecheck + `pnpm test`: brak nowych błędów (4 porażki plików CMS to stan sprzed zmian, zweryfikowano przez `git stash`). Uwaga: brakujący wpis w pl.json fallbackuje do EN przez `fallbackLng: "en"` + `addResourceBundle(..., true, true)`.

### Faza 0.4 — Design system shadcn (spójność 2a)
- Neutralna paleta, `--radius: 10px`, tekst 14px (już w `default-theme-options.ts`).
- Do reużycia z SDK `~/components/ui/`: Button, Input, Tabs, Badge, Separator, Select, Switch, Sheet, DropdownMenu, ScrollArea, Tooltip, HoverCard. (Dokładnie lista komponentów ze speca 2a.)

---

## 3. Mapowanie widoków speca → mechanizmy SDK

| Widok speca | Obecny odpowiednik | Akcja |
|---|---|---|
| Topbar (2a) | `pages/extensions/topbar.tsx` (TopbarLeft/AddressBar/CanvasTopBar/TopbarRight) | Przebudowa kompozycji + styl |
| Zakładki Sekcje/Motyw/Strony | icon-rail + `registerChaiSidebarPanel` | Nowy lewy panel z Tabs |
| Sekcje: drzewo + search | `ListTree` (outline/list-tree.tsx) + `treeDSBlocks` | Wrap + grupowanie + search |
| Sekcje: „Wygeneruj sekcję" | `useAskAi` / `AskAI` / ai-panel | Reużycie w sekcji |
| Motyw: grupy tokenów | `ThemeConfigPanel` + `useTheme`/`useThemeOptions`/`useSaveWebsiteData` + `CssThemeVariables` | Nowa nawigacja grup, reużycie pól edycji |
| Strony: lista/statusy | `PageManagerNew` + `useWebsitePrimaryPages` | Wrap w zakładkę |
| Strony: ustawienia (Ogólne/SEO/Dostęp) | SEO panel + page hooks | Nowy prawy panel strony |
| Prawy panel: Treść/Styl/Zaawans. | `SettingsPanel` (settings/styles) | Przejmenowanie + nowa zakładka |
| Breakpoints/zoom/undo | `canvas-breakpoints`, `scale-percent`, `undo-redo` | Przeniesienie do topbara |
| Mobile (2b) | brak | Nowy MobileLayout (Faza 6) |

---

## 4. Faza 1 — Topbar (2a)

**Cel:** topbar zgodny ze specem, bez gubienia funkcji.

**Pliki:** nowy `packages/chaibuilder-sdk/src/pages/client/layouts/topbar/builder-top-bar.tsx` (zarejestrowany `registerChaiTopBar`) + modyfikacja `pages/extensions/topbar.tsx` (lub zastąpienie go).

**Kompozycja (grid 3 kolumny):**
- Lewo: `TopbarLeft` (logo/szkoła) + breadcrumb „Szkoła XYZ" + strzałka + „Strona główna ▾" (`PageDropdownInHeader`, `useCurrentActivePage`). Stan „Wersja robocza"/„Zapisano" (`useSavePage.saveState`).
- Środek: `UndoRedo` (↺↻) + `Breakpoints` (▭▯▮) + `ScalePercent` (100%).
- Prawo: „Zapisano" (save-state), „Podgląd" (`PreviewButton` → `/api/preview`), „Publikuj" (`PublishButton` + publish theme/page + unpublish — reużycie `topbar-right.tsx`).

**Styl:** shadcn neutral, `h-[50px]`, border-b.

**DoD:** topbar działa na desktopie i nie psuje PageManager/Preview/Publish/Save; stany save-state poprawne.

> **POSTĘP (2026-08-01): ✅ Faza 1 zrobiona (wraz z Fazą 2, Sesja B).** Decyzje: **układ wg speca 2a** (środek = `Breakpoints`+`ScalePercent`; prawo = label save-state + `UndoRedo` + `PreviewButton` + `PublishButton`); **funkcje spoza speca (ClearCanvas, DataBinding toggle, DarkMode, Open live page) ukryte w menu „⋯"** (bez gubienia funkcji); **PagesManagerTrigger trzymany do Fazy 4** (przycisk Folder przy breadcrumbie, zakładka Strony to wciąż „Coming soon"). Pliki: nowy `layouts/topbar/builder-top-bar.tsx` (grid 3 kolumny, shadcn neutral, `SaveStateLabel` z `useSavePage().saveState` + guard beforeunload, `TopBarOverflowMenu`, `LiveLinkMenuItem`); `PreviewButton`/`PublishButton`/`LiveLinkButton` wyeksportowane z `topbar-right.tsx` (default `TopbarRight` bez zmian); rejestracja w `chaibuilder-pages.tsx:43` → `BuilderTopBar` (stary `extensions/topbar.tsx` nietknięty, został fallbackiem dla demo/RootLayout). i18n: +7 kluczy do `en.json` i `pl.json` (Draft, Save draft, Open live page, Open preview in new tab, Clear canvas, Dark mode, Data Binding; `Saving` do PL), `i18n.test.ts` rozszerzony — 4/4 ✅. **Odchyłki:** DarkMode menu-item jest ukryty gdy `flags.darkMode` off (app nie przekazuje flagi) — spójne ze starym `CanvasTopBar` (gating `useBuilderProp`); „Szkoła XYZ" to placeholder — bez `topLeftCorner` pokazuje się tylko breadcrumb strony; React warning „Encountered a script tag…" na canvasie to stan sprzed zmian (blok HTML w treści miau). Zweryfikowano: build SDK OK, Playwright smoke na `miau.localtest.me:3000/editor?page=<id>` → tab Sekcje/Motyw/Strony, breadcrumb, 100%, Zapisano, Published, menu ⋯ (Wyczyść płótno/Wiązanie danych/Otwórz opublikowaną stronę), dropdown strony (Duplikuj/Edytuj/Cofnij publikację/Usuń), dropdown publikacji (Unpublish), PageManager z przycisku Folder, bez nowych błędów JS. `tsc` app: błędy tylko w pre-existing CMS/e2e.

---

## 5. Faza 2 — Lewy panel z zakładkami + Sekcje

**Cel:** nowy `BuilderLayout` z lewym panelem `Tabs: Sekcje | Motyw | Strony`; canvas zawsze w centrum; prawy panel niezależny (reguła speca: przełączanie zakładek nie gubi kontekstu).

**Pliki:** `builder-layout.tsx`, `layouts/left-panel/builder-left-panel.tsx`, `left-panel/sections-tab.tsx`, `left-panel/theme-tab.tsx` (Faza 3), `left-panel/pages-tab.tsx` (Faza 4).

### Sekcje tab (`sections-tab.tsx`)
- **Header:** `SearchInput` („Szukaj sekcji lub bloku") + „+" (add-section).
- **Grupowanie Nagłówek/Szablon/Stopka:** nowy util `~/pages/client/layouts/left-panel/section-groups.ts` — transform `treeDSBlocks` (drzewo top-level bloków) na 3 grupy wg heurystyki:
  - Nagłówek: `_type`/`_name` w {Navbar, Header, Nav, Navigation, StickyHeader, Announcement…}
  - Stopka: {Footer, FooterNav…}
  - reszta → Szablon.
  - Mapa grup konfigurowalna (export `SECTION_GROUP_RULES`), liczba bloków przy grupie.
- **Węzeł sekcji:** nazwa + ikona typu + `⋯` (menu akcji: `BlockMoreOptions` reużyte) + znacznik „nadpisane" (jeśli sekcja ma lokalne tło — sprawdzenie `block.props` pod `background`).
- **Dodawanie sekcji:** podgląd sekcji (`AddBlocksPanel` w trybie „Sekcje", `showPredefinedBlockCategoryAtom`), drag&drop (`useIsDragAndDropEnabled`), „Dodaj sekcję" punkt z `+`.
- **„✦ Wygeneruj sekcję z opisu":** przycisk → dialog z textarea (pattern `AskAI`) → `useAskAi` → wstawia wygenerowane bloki (reużycie logiki `ai-panel`).
- **Zaznaczanie:** klik w drzewie → `useSelectedBlockIds` (synchro z canvasem, jak w `ListTree.onSelect`).

**DoD:** drzewo zgrupowane, search filtruje, klik zaznacza na canvasie, add-section i AI działają, canvas nie traci kontekstu przy przełączaniu zakładek.

> **POSTĘP (2026-08-01): ✅ Faza 2 zrobiona.** Decyzje wg zatwierdzonego planu: **grupowanie Opcja A** (reużycie react-arborist — DnD/rename/expand/⋯ zachowane), **AI Opcja 1** (UI + stub „Funkcja w przygotowaniu", backend podpięty później), **height parametryzowane** (per-grupowy `countNodes()*25+16` — drzewo rozmiaru treści w ScrollArea), **„Nadpisane"** = heurystyka `background`/`className` vs `getBlockDefaultProps(type)`. Pliki: `left-panel/section-groups.ts` (grupowanie + `filterSections` + `isSectionOverridden`), `section-groups.test.ts` (7 testów ✅), `left-panel/section-tree.tsx` (wyekstrahowany z `list-tree.tsx` — `Tree`+`Node`+keyboard+context menu, props `data`/`height`/`nodeRenderer`), `left-panel/sections-tab.tsx` (header `SearchInput`+„+", przycisk „Wygeneruj sekcję z opisu", grupy z licznikami, badge „nadpisane", dialogs `AddSectionDialog` (AddBlocksPanel na root) i `GenerateSectionDialog` (textarea → `askAiCallBack("content",…)` → `addBlocks` na root; przy braku `blocks` stub)), `left-panel/builder-left-panel.tsx` (Tabs wydzielone z `builder-layout.tsx`). **Odchyłki:** `Hero` usunięte z reguł Nagłówek (hero to treść, nie nagłówek); puste grupy (np. Stopka bez bloków) ukrywane zamiast „No sections"; nazwy sekcji skracane do 17 znaków (istniejący `truncateText` w `node.tsx`); „+" ma `aria-label="Add section"`; dialog add-blocks zamyka się przez `CLOSE_ADD_BLOCK`. i18n: +17 kluczy do `en.json` i `pl.json` (`Add section`, `Generate section from description`, `Generate`, `Generating...`, `Feature under construction`, `Section generated`, `This page is empty`, `Get started by adding your first block to begin building your page`, itd.), `i18n.test.ts` rozszerzony o `SECTIONS_TAB_KEYS` — 5/5 ✅. Zweryfikowano: build SDK OK, typecheck SDK 0 błędów, 552 testy SDK ✅ (4 porażki plików CMS w app to stan sprzed zmian), Playwright smoke 13/13 ✅ na `miau.localtest.me:3000/editor?page=960f3eb0-…` (zakładki, search, grupy NAGŁÓWEK/SZABLON z licznikami, klik zaznacza blok — placeholder „Please select a block…" znika, „+" otwiera dialog, „Wygeneruj sekcję" otwiera dialog, przełączanie zakładek zachowuje kontekst, brak błędów JS). Uwaga: restart dev servera wymagany po rebuildzie SDK (Turbopack nie przeładowuje `dist/`).

---

## 6. Faza 3 — Zakładka Motyw (3a)

**Cel:** lewy panel = grupy tokenów, prawa strona panelu = edycja grupy (drill-down), live preview.

**Pliki:** `left-panel/theme-tab.tsx`, `theme/theme-groups.ts` (model grup), `theme/token-editors/*` (reużycie `ColorPickerInput`, `FontSelector`, `BorderRadiusInput` z `sidepanels/panels/theme-configuration/`).

**Model grup (spec 3a):**
```
PODSTAWY
 ├─ Kolory            → ChaiTheme.colors (Akcent=primary, Tekst=foreground, Tło=background, Tło alt=muted/card)
 ├─ Typografia        → fontFamily (heading/body)
 ├─ Odstępy i szerokość → PLACEHOLDER („wkrótce")
 └─ Zaokrąglenia i cienia → borderRadius (+ cień = PLACEHOLDER)
KOMPONENTY
 ├─ Przyciski         → PLACEHOLDER (mapowanie na design tokens później)
 ├─ Pola formularzy   → PLACEHOLDER
 └─ Karty kursów      → PLACEHOLDER
MARKA
 ◈ Logo i favicon     → reużycie ImagePicker / digital-asset-manager (logo w `websiteConfig`?)
 ☺ Ikony              → PLACEHOLDER
```
- **Edycja:** każda realna grupa to komponent pól zapisujący do `useTheme()` + `debouncedSaveTheme()` (jak `ThemeConfigPanel`). Presety („Gotowe palety") reużyte z `themePresets`.
- **„Tryb ciemny na stronie":** toggle `useDarkMode` (indeks 1 kolorów), tak jak teraz.
- **„Zmiany motywu dotyczą wszystkich stron":** info-banner; zapis globalny przez `useSaveWebsiteData({type:"THEME"})` (już podpięte w chaibuilder-pages.tsx:226).
- **Live preview:** ponieważ `CssThemeVariables` renderuje `<style id="chai-theme">`, zmiana tokenu od razu zmienia CSS na canvasie — wystarczy, że canvas preview nie ma izolacji stylesheet.

**DoD:** edycja Kolory/Typografia/Zaokrąglenia działa z live preview i zapisem globalnym; placeholder-y widoczne z oznaczeniem „wkrótce"; palety (presets) działają.

> **POSTĘP (2026-08-01): ✅ Faza 3 zrobiona.** Decyzje: **pełna paleta ChaiTheme** w edytorze kolorów (nie tylko 4 tokeny ze speca) + **presety Select + Apply** (istniejący UI, nie siatka swatchy). Architektura wg planu: lewy panel = grupy tokenów, prawy panel = edycja grupy (drill-down przez `selectedThemeGroupAtom` + `setRightPanel("theme")`). Pliki: `theme/theme-groups.ts` (model 3 sekcji PODSTAWY/KOMPONENTY/MARKA, 9 grup, `kind: editor|placeholder`, `THEME_COLOR_TOKEN_MAP`, `selectedThemeGroupAtom`) + `theme-groups.test.ts` (7 testów ✅); `left-panel/theme-tab.tsx` (header „Aktywny motyw" + „Zmień", lista grup z ikonami i badge „Wkrótce", banner „Zmiany motywu dotyczą wszystkich stron"); `theme/theme-editor.tsx` (header „Motyw · Jasny/Ciemny" + nazwa grupy; switch po grupie); `theme/use-theme-editor.tsx` (hook wydzielony z `ThemeConfigPanel`: `handleColorChange`/`handleFontChange`/`handleBorderRadiusChange`/`setThemeWithHistory`, toast „Theme updated" z i18n); `theme/token-editors/color-tokens.tsx` (pełna paleta, `ColorPickerInput`, presety, toggle „Tryb ciemny na stronie" gated `flags.darkMode`, info o nadpisanym tle), `typography.tsx` (`FontSelector`), `border-radius.tsx` (`BorderRadiusInput` + „Cienie wkrótce"), `placeholder.tsx`. `builder-layout.tsx:47`: `ThemeConfigPanel` → `ThemeEditor` (stary panel w `root-layout.tsx` nietknięty — fallback dla demo). App: `editor.tsx` dodał `flags.darkMode: true` (bez tego toggle ciemnego motywu ukryty). i18n: +22 klucze EN (do `en.json`) i PL (do `pl.json`; usunięty duplikat „Coming soon" z pl.json), `i18n.test.ts` rozszerzony o `THEME_TAB_KEYS` — 6/6 ✅. Zweryfikowano: build SDK OK, 559 testów SDK ✅ (7 nowych theme-groups), typecheck app tylko pre-existing CMS/e2e, Playwright smoke na `miau.localtest.me:3000/editor?page=960f3eb0-…` → zakładka Motyw, 9 grup, sekcje PODSTAWY/KOMPONENTY/MARKA, banner, edytor kolorów (Gotowe palety, Apply, 19 swatchy, switch ciemny), typografia (2 selecty), zaokrąglenia (slider), placeholdery „Wkrótce", **preset Solarized Apply → live preview w iframe: `--background` 0 0% 100% → 44 87% 94%, `--primary` → 331 64% 52%**, dark mode toggle dodaje `.dark` do iframe. **Odchyłki:** 1) swatch koloru testowany przez symulację natywnego pickera headless nie triggeruje onChange Reacta — to ograniczenie harnessu, pipeline atom→iframe zweryfikowany przez preset Apply (prawdziwy klik); 2) klik w grupy bywa flaky przy auto-zapisie motywu (FontSelector auto-apply niezarejestrowanego fonta → save → re-hydracja edytora) — stan sprzed zmian (FontSelector reużyty bez zmian).

---

## 7. Faza 4 — Zakładka Strony (3b)

**Cel:** lista stron + szablony + systemowe; wybór strony ładuje ją na canvas; prawy panel = ustawienia strony.

**Pliki:** `left-panel/pages-tab.tsx`, `right-panel/page-settings.tsx`.

### Lista (pages-tab)
- **Header:** `PageManagerSearchAndFilter` (search + filtr typu), „+ Nowa strona" → `AddNewPage` (PageCreator).
- **Sekcje listy (grupowane):**
  - „STRONY": strony z statusem — **Live** (online), **Robocza** (draft), **Ukryta** (nie online i nie opublikowana) — z `useWebsitePrimaryPages`/`usePageLockStatus`.
  - „SZABLONY": strony oznaczone jako szablon (`mark-as-template`), z licznikiem „12 stron"/„31 stron" (liczba dzieci, jeśli dostępna).
  - „SYSTEMOWE": strony systemowe — `Formularz zapisu`, `404` (w `pageTypes` z `isSystem`/`hasSlug`, do weryfikacji w `usePageTypes`).
- **Klik w stronę** → `changePage`/`navigateToPage` (loader z `usePageAllData` już jest w `ChaiBuilderInner`).
- **Menu akcji:** `⋯` → `page-action-dropdown` (duplikuj, usuń, publikuj/cofnij, mark/unmark template) — reużyte.

### Ustawienia strony (page-settings, w prawym panelu — Faza 5)
- Tabs **Ogólne | SEO | Dostęp**:
  - **Ogólne:** nazwa strony, Adres URL (`slug-input`), Szablon (select), „Widoczna w menu", „Indeksowana w Google" (→ `noIndex`/`noFollow`), przyciski Duplikuj/Usuń.
  - **SEO:** reużycie pól `seo-panel.tsx` (title, description, canonical, og, search snippet) + „Podgląd w wynikach Google" (mały preview block) + JSON-LD.
  - **Dostęp:** status publikacji, hasło/dostęp tylko dla zalogowanych (jeśli backend wspiera — do weryfikacji; inaczej placeholder).

**DoD:** lista ze statusami, szablony, systemowe; klik otwiera stronę na canvasie; ustawienia Ogólne/SEO zapisują się (`useUpdatePage`); podgląd Google renderuje się z danych.

> **POSTĘP (2026-08-01): ✅ Faza 4 zrobiona.** Decyzje zatwierdzone przed startem: **statusy 2-stanowe** (Live=`online`, reszta Robocza — kropka w `PageItem`; backend nie rozróżnia draft/hidden, `changes` zawsze `[]`); **SYSTEMOWE warunkowo** (grupa renderowana tylko gdy `pageType.isSystem` istnieje — API jeszcze nie wysyła, więc teraz ukryta); **page-settings w całości w Fazie 4** (nie w 5); **mark/unmark template odsłonięte** w `⋯`, bez licznika „12 stron" (brak źródła danych). Pliki: `left-panel/pages-tab.tsx` (flat filter + `buildPageTree` per grupa, reużycie `PageManagerSearchAndFilter` + `RenderPageItems`/`PageItem`, klik → `navigateToPage` + `setRightPanel("page")`, modale add/edit/delete/duplicate/unpublish/mark/unmark), `left-panel/page-groups.ts` (grupowanie STRONY/SZABLONY/SYSTEMOWE wg `online`/`pageType==="template"`/`isSystem`, filtr pustych grup) + `page-groups.test.ts` (8 testów ✅), `right-panel/page-settings.tsx` (Tabs Ogólne|SEO|Dostęp: nazwa/URL/Template/Indeksowana/Visible-in-menu(placeholder)/Duplikuj/Usuń; SEO compact z „Podglądem w wynikach Google"; Dostęp = status + hasło(placeholder); zapis `useUpdatePage`; wzorzec adjust-state-during-render zamiast efektu — lint `set-state-in-effect`). **Infrastruktura:** `rightPanelAtom` rozszerzony o `"page"` (`use-theme.ts`), routing `panel === "page"` w `builder-layout.tsx` + efekt auto-powrót do `"block"` przy zaznaczeniu bloku (blok Treść/Styl/Zaawansowane to Faza 5), mark/unmark odkomentowane w `page-action-dropdown.tsx` + propsy `setMarkAsTemplate`/`setUnmarkAsTemplate` (page-item przekazuje przez `onClickAction`; w dropdown topbara pozostają ukryte). i18n: +24 klucze EN/PL (Templates, System pages, Live, General, SEO, Access, Page name, Visible in menu, Indexed in Google, Search engine preview, SEO Title/Description, Canonical URL, Publication status, Mark/Unmark as template, Add Page, Empty List!, Add new page to start, Search pages…), `i18n.test.ts` + `PAGES_TAB_KEYS` — 7/7 ✅. **Odchyłki:** `usePageExpandManager`/`pageTypeFilter` są globalne (współdzielone modal↔zakładka) — celowo bez izolacji (spójność widoków), punkt QA; `PageManagerSearchAndFilter` zachował `autoFocus` na searchu; nie używamy `organizePages` w zakładce (jego grupowanie partialów kolidowało z własnym grupowaniem — zamiast tego flat filter + `buildPageTree` per grupa). Zweryfikowano: build SDK OK, typecheck SDK 0 błędów, 567 testów SDK ✅ (+8 page-groups), typecheck app tylko pre-existing CMS/e2e, `pnpm test` app 4 porażki CMS (stan sprzed zmian), i18n 7/7 ✅.

---

## 8. Faza 5 — Prawy panel (blok / strona / motyw)

**Cel:** prawy panel kontekstowy:
- **Blok zaznaczony** → zakładki **Treść | Styl | Zaawansowane** (transformacja `SettingsPanel`):
  - `settings-panel.tsx` ma Tabs Settings/Styling → zmienić na 3 zakładki; „Zaawansowane" = `BlockAttributesEditor` + `manual-classes` (klasy CSS, atrybuty, własny kod) — **ukryte dla ról bez dev** (gating poniżej).
  - Prawa kolumna speca 2a (Etykieta/Odnośnik/Wariant/Rozmiar/Widoczny na telefonie) to już pola `BlockSettings` — tylko ostylowanie.
- **Brak bloku + wybrana strona** → `page-settings.tsx` (Faza 4).
- **Brak bloku i strony** → ekran „Wybierz blok lub stronę" (zamiast „Please select a block").
- `useRightPanel` rozszerzyć: `"block" | "page" | "theme" | "ai"` (albo osobny atom `pageSettingsMode`).

**Gating „Zaawansowane" (dev):** obecnie `usePermissions` zwraca `true` gdy `permissions` jest null. Wprowadzić prop `flags.devMode` (lub `role`) — z `editor.tsx` (app) przekazać np. `flags: { devMode: false }` dla ról bez dev. Zakładka „Zaawansowane" widoczna tylko gdy `devMode`.

**DoD:** 3 zakładki bloku; page-settings w prawym panelu; gating dev działa; brak regresji w edycji stylów.

> **POSTĘP (2026-08-02): ✅ Faza 5 zrobiona.** Ważny kontekst: część pracy była już w working tree jako niecommitowana robota z poprzedniej sesji (3-zakładkowy `SettingsPanel` + `advanced-panel.tsx` + `flags.devMode` w `editor.tsx` + `role` w `editor/api/route.ts` + typy) — ta sesja domknęła luki, dopolishowała i zweryfikowała. Decyzje (zatwierdzone przed startem): **neutralny pusty stan** (panel `"page"` → `PageSettings`; zaznaczony blok → `SettingsPanel`; nic → `EmptyRightPanel`); **`?devMode=1` tylko w dev** (w produkcji ignorowane — rola z sesji). Pliki: nowy `right-panel/empty-right-panel.tsx` („Wybierz blok lub stronę"); `builder-layout.tsx:57-68` (routing 4-stanowy, bez klauzuli `!selectedBlock`); `settings-panel.tsx` (badge `DEV` w triggerze Zaawansowane, hint `Advanced (CSS classes)` w treści zakładki, `ResetStylesButton` przeniesiony z triggera „Styl" do nagłówka treści); `pages-tab.tsx` **fix**: `changePage` czyści teraz selekcję bloku (`setIds([])`+`setStyleBlocks([])`) — bez tego efekt auto-powrotu w `builder-layout` cofał panel do `"block"` po kliknięciu strony (maskowane wcześniej przez `!selectedBlock → PageSettings`); `editor.tsx` `useDevRole()`: `devMode=1` + `NODE_ENV==="development"` nadpisuje rolę na `admin`. i18n: +5 kluczy do `en.json`/`pl.json` (`Advanced (CSS classes)`, `Visibility`, `Conditional Visibility`, `Enter a JavaScript expression`, `Select a block on the canvas or a page from the Pages tab to edit its settings`), `i18n.test.ts` rozszerzone o te klucze — 8/8 ✅. **Odchyłki:** badge renderuje się jako `DEV` (uppercase przez klasę CSS); hint „(klasy CSS)" w treści zakładki, nie w triggerze (wąska 3-kolumna w 280px); stary pusty stan „Select a block or page" w `settings-panel.tsx` został jako fallback RootLayout/demo; prawa kolumna speca 2a (Etykieta/Odnośnik/Wariant/Widoczny na telefonie) to istniejące pola schematu bloków (Button itd.) — bez zmian. Zweryfikowano: build SDK OK, 567 testów SDK ✅, i18n 8/8 ✅, typecheck app tylko pre-existing CMS/e2e, lint app tylko pre-existing route.ts, Playwright smoke na `miau.localtest.me:3000/editor` → bez zaznaczenia „Wybierz blok lub stronę"; zaznaczony blok: guest = 2 zakładki (Treść/Styl), `?devMode=1` = 3 zakładki (+Zaawansowane, badge DEV, hint klasy CSS, Własny kod/manual classes); klik strony w zakładce Strony → PageSettings (Ogólne/SEO/Dostęp, PL), bez nowych błędów JS (warnings pre-existing: script tag, UNSAFE_componentWillReceiveProps). Uwaga: dev server wymagał restartu po rebuildzie SDK.

---

## 9. Faza 6 — Mobile editor (2b) — plan szczegółowy

### 9.1 Założenia
- Tryb mobilny wykrywany po **szerokości okna** (nie canvas): hook `useIsMobile()` (`window.innerWidth < 768`, listener resize, atom).
- **Wymagane: wyłączyć `ScreenTooSmall`** — overlay blokuje wszystko <1280px (screen-too-small.tsx). Dodać prop `smallScreenComponent={null}` gdy mobile (lub flagę), by nie renderował „Screen too small".
- `BuilderLayout` rozgałęzia: `isMobile ? <MobileBuilderLayout/> : <DesktopBuilderLayout/>`.

### 9.2 MobileBuilderLayout
- **Topbar (kompaktowy, ~44px):** „‹" (wróć do strony/wyjdź), „Szkoła XYZ", save-state (Zapisano), `⋯` Publikuj (reużycie `PublishButton` w wersji ikonowej).
- **Canvas:** na całą wysokość (`CanvasArea`); breakpointy po cichu na „xs".
- **Bottom Sheet** (shadcn `Sheet` side=bottom) — stany 1–4 speca, sterowane atomem `mobileSheetAtom: "collapsed" | "settings" | "menu" | "actions"` + `selectedBlockId`.

### 9.3 Stany Sheeta
1. **Collapsed (chip zaznaczenia):** pasek przy dole: „Polecane kursy · sekcja · 4 bloki ⋯" — nazwa z `useSelectedBlock()`; tap → stan settings; `⋯` → stan actions; osobne przyciski `+` (dodaj), `☰` (menu).
2. **Settings:** `SettingsPanel` (z Fazy 5) w sheecie; header „‹ Wróć" (→ collapsed) + „⋯".
3. **Menu (☰):** lista:
   - **Drzewo sekcji** (grupowane, Faza 2) — przewijane, `ListTree` w trybie mobilnym (zmniejszony indent, tap = zaznacz i zamknij → settings),
   - **„✦ Wygeneruj sekcję"** (AI, dialog),
   - **„Inspector: włączony"** toggle,
   - **↺ Cofnij / ↻ Ponów**,
   - **WIĘCEJ:** Ustawienia motywu (→ motyw), Strony (→ lista), Podgląd na żywo (→ `/api/preview`).
4. **Actions (⋯ na bloku):** „‹ Wróć" + akcje: Kopiuj, Duplikuj (`duplicate-block`), Nazwa (`_name` edit), Ukryj (visibility), Usuń sekcję; poniżej „BLOKI W SEKCJI" (`ListTree` sekcji wewnętrznych) + „＋ Dodaj blok".

### 9.4 Pliki mobilne
- `layouts/mobile/mobile-builder-layout.tsx`
- `layouts/mobile/mobile-top-bar.tsx`
- `layouts/mobile/mobile-bottom-sheet.tsx`
- `layouts/mobile/mobile-sheet-states.ts` (atomy/stany)
- `layouts/mobile/mobile-menu.tsx`, `mobile-actions.tsx`, `mobile-tree.tsx`
- Hook `hooks/use-is-mobile.ts` (fork) + patch `ScreenTooSmall`.

### 9.5 Ryzyka mobilne
- `ListTree` używa `react-arborist` z `height={window.innerHeight - 160}` — w sheecie wysokość inną; parametryzować height.
- Drag&drop na telefonie (touch) — zostawić tap-zaznaczenie jako primary; DnD poza zakresem.
- `Sheet` musi mieć `max-h-[85vh]`, body nie przewija.
- `ScreenTooSmall` — bez patcha mobile nie wystartuje.

**DoD:** 4 stany sheeta przechodzą między sobą; edycja bloku i nawigacja działają z toucha; autozapis/publikuj działają; canvas na pełną wysokość bez overlay.

---

## 10. Faza 7 — QA / polerowanie / testy

- **Testy SDK:** vitest — dla nowych utilów: `section-groups` (heurystyka grup), `theme-groups` (mapowanie tokenów), `use-is-mobile`. Wzorce w `packages/chaibuilder-sdk/src/**/*.test.ts*`.
- **Regresja:** autozapis, undo/redo, publish/unpublish, publish-theme, page-lock, języki, dynamiczne strony, SEO modal, AI.
- **Dark mode** 2a (shadcn dark) — sprawdzić kontrast i `useDarkMode`.
- **E2E (app):** Playwright — sprawdzić czy istniejące testy edytora nie pękły; dodać smoke (open editor, switch tabs, select block, save).
- **i18n PL:** pełny audyt brakujących kluczy (fallback EN).

---

## 11. Kolejność sesji (każda faza = osobna sesja)

1. **Sesja A — Faza 0:** forward `layout`, nowy export, build-cykl, i18n PL, `BuilderLayout` z placeholderami 3 zakładek (Sekcje pokazuje obecne drzewo). *Kryterium wejścia: edytor działa z nowym layoutem bez regresji.*
2. **Sesja B — Faza 1 + Faza 2:** topbar + Sekcje (grupowanie, search, add, AI).
3. **Sesja C — Faza 3:** Motyw (tokeny realne + placeholdery).
4. **Sesja D — Faza 4:** Strony (lista + statusy + systemowe).
5. **Sesja E — Faza 5:** prawy panel (Treść/Styl/Zaawansowane + page-settings + gating dev).
6. **Sesja F — Faza 6:** mobile (2b, 4 stany sheeta).
7. **Sesja G — Faza 7:** QA, dark mode, testy, i18n audyt.

---

## 12. Ryzyka / zależności

- **Build SDK jest wolny** (tsc + vite) — każda zmiana w forku wymaga przebudowy; warto w Sesji A zautomatyzować watch-build (`vite build --watch` lub dev alias).
- **`layout` nie jest forwardowany** — bez patchu Fazy 0 nie da się aktywować nowego UI.
- **Tokeny komponentowe (Przyciski/Pola/Karty), Odstępy, Ikony** — nie istnieją w `ChaiTheme`; placeholdery do czasu rozszerzenia `ChaiTheme` + `getChaiThemeCssVariables` (chai-theme-helpers.ts:73).
- **`ScreenTooSmall` blokuje mobile** — patch obowiązkowy w Fazie 6.
- **Heurystyka grup sekcji** wymaga doprecyzowania listy typów (Nagłówek/Stopka) — łatwa zmiana w `SECTION_GROUP_RULES`.
- **Dev-role / permissions** — gating „Zaawansowane" wymaga przekazania `flags.devMode` z aplikacji (obecnie `permissions: null` = wszystko dozwolone).
