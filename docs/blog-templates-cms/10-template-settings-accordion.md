# Fazka: Przebudowa sidebara edytora — „Ustawienia szablonu" jako akordeon (Shopify-style)

> Status: **plan** — zatwierdzony 2026-09-05.
>
> Powiązane: `09-builder-left-panel-redesign.md` (F7), `docs/shopify-like/` (topbar).

## 1. Cel

Przebudowa lewego sidebara edytora w model Shopify:

1. **„Ustawienia szablonu" (⚙)** staje się pełnym sidebar-em typu **akordeon** —
   ustawienia bieżącej strony/szablonu + kategorie motywu rozwijane **inline**
   (bez osobnego dolnego panelu).
2. **Dolny wyskakujący panel (slide-up) znika całkowicie** — zarówno panel
   ustawień **strony** (auto-wysuwany przy wejściu na stronę), jak i panel
   ustawień **bloku**.
3. **Edycja bloku** przenosi się **inline**: zaznaczenie bloku podmienia
   drzewo sekcji na `SettingsPanel` w treści lewego panelu.
4. **SEO wypada ze zębatki** — ma własny przycisk/mode „SEO" w topbarze.

## 2. Decyzje użytkownika (2026-09-05)

1. Zostaje obecny zestaw **9 grup motywu** (z realnymi edytorami); **bez**
   kategorii e-commerce z referencji Shopify (Koszyk, Ceny, Wyszukiwanie...).
2. Sekcja **„Strona"** (ustawienia bieżącej strony) — zawsze **pierwsza** i
   **domyślnie rozwinięta** przy wejściu w tryb ⚙.
3. **SEO usuwamy ze zębatki** — PageSettings w akordeonie pokazuje tylko
   zakładki **Ogólne + Dostęp** (bez SEO); osobny tryb „SEO" w topbarze
   pozostaje odpowiedzialny za metadane SEO.

## 3. Docelowy układ lewego panelu

```
[Left panel 360–560px resizable]
│
├─ tryb SEKCJE (Layers)
│    ├─ bez bloku   → nagłówek "Nazwa strony" + SectionsTab (drzewo)
│    └─ blok wybrany → nagłówek: BlockBreadcrumb + BlockQuickActions + X(odznacz)
│                      treść: SettingsPanel (Content/Styling/Advanced) inline
│
├─ tryb USTAWIENIA SZABLONU (⚙)              ← NOWY akordeon
│    ├─ karta "Aktywny motyw" (Jasny/Ciemny + Zmień)
│    ├─ [Accordion type="multiple"]
│    │    STRONA (domyślnie otwarta)
│    │      ▸ Ustawienia strony — PageSettings inline: Ogólne | Dostęp (bez SEO)
│    │    SZABLON (gdy edytujemy szablon kolekcji)
│    │      ▸ Ustawienia szablonu — TemplateSettings inline
│    │    PODSTAWY
│    │      ▸ Kolory → ColorTokensEditor
│    │      ▸ Typografia → TypographyEditor
│    │      ▸ Odstępy i szerokość → SpacingWidthEditor
│    │      ▸ Zaokrąglenia i cienie → BorderRadiusEditor
│    │    KOMPONENTY
│    │      ▸ Przyciski → ButtonsEditor
│    │      ▸ Pola formularzy → FormFieldsEditor
│    │      ▸ Karty kursów → CourseCardsEditor
│    │    MARKA
│    │      ▸ Logo i favicon → LogoFaviconEditor
│    │      ▸ Ikony → Placeholder ("Wkrótce")
│    └─ stopka "Zmiany motywu dotyczą wszystkich stron"
│
└─ tryb SEO (osobny guzik w topbarze) → SeoLeftPanel (bez zmian)
```

## 4. Zachowanie

- **Blok zawsze wygrywa**: zaznaczony blok w trybie ⚙/Sekcje pokazuje inline
  `SettingsPanel` (wzorzec jak w F7).
- W trybie **SEO** dolny/sidebar pokazuje tylko `SeoLeftPanel` (bez bloku).
- „Zmień" w karcie „Aktywny motyw" → rozwija akordeon przy **Kolory** +
  `scrollIntoView`.
- Domyślnie rozwinięte: sekcja **Strona** + kategoria **Kolory**.

## 5. Zakres zmian (SDK fork `packages/chaibuilder-sdk/src/`)

| Plik | Zmiana |
|---|---|
| `hooks/use-theme.ts` | Usunięcie `leftPanelBottomAtom`, `useLeftPanelBottom`, typu `LeftPanelBottomTab`. `LeftPanelMode` bez zmian. |
| `pages/client/layouts/left-panel/builder-left-panel.tsx` | Usunięcie dolnego slide-up panelu (stałe `BLOCK_PANEL_HEIGHT`/`CONTEXT_PANEL_HEIGHT`, `useEffect` doboru panelu, nagłówek panelu, `handleBack`). Nowy content switcher: SEO / inline block settings / `TemplateSettingsTab` / `SectionsTab`. |
| `pages/client/layouts/left-panel/theme-tab.tsx` | Przebudowa na `TemplateSettingsTab` (akordeon Radix `type="multiple"`). Zachowany alias `export ThemeTab` (mobile). |
| `pages/client/layouts/theme/theme-editor.tsx` | Wyodrębnienie `ThemeGroupContent({ groupId })` (obecny switch); `ThemeEditor` re-używa go. |
| `pages/client/layouts/right-panel/page-settings.tsx` | Prop `embedded`: root `flex flex-col` zamiast `flex h-full flex-col`, bez wewnętrznych `min-h-0 flex-1`/`overflow-y-auto`; **ukryta zakładka SEO** (Ogólne \| Dostęp). Logika zapisu bez zmian. |
| `pages/client/layouts/right-panel/template-settings.tsx` | Prop `embedded` analogicznie (bez SEO — formularz szablonu). |
| `pages/client/layouts/mobile/mobile-bottom-sheet.tsx` | Bez zmian poza utrzymanym importem `ThemeTab` (akordeon działa też w sheet). |
| `src/core/locales/en.json` (SDK) | Nowe klucze: `Page`, ewentualnie `Theme settings`. |
| `src/app/(builder)/editor/pl.json` (aplikacja) | Nowe klucze: `"Page": "STRONA"`, reszta polskich tłumaczeń. |
| `src/app/(builder)/editor/i18n.test.ts` | Aktualizacja list `THEME_TAB_KEYS` / `LEFT_PANEL_KEYS` o nowe klucze. |

## 6. Szczegóły implementacyjne (per plik)

### 6.1 `hooks/use-theme.ts`
- Usuwamy: `leftPanelBottomAtom`, `leftPanelBottomAtom.debugLabel`, `useLeftPanelBottom`, typ `LeftPanelBottomTab`.
- Zostaje: `LeftPanelMode`, `leftPanelModeAtom`, `useLeftPanelMode`, `useRightPanel`/`rightPanelAtom` (nieużywane w layouts — zostawiamy), `useAiDrawerOpen`, `useActiveSettingsTab`.

### 6.2 `layouts/left-panel/builder-left-panel.tsx`
- **Do usunięcia**: stałe `BLOCK_PANEL_HEIGHT`, `CONTEXT_PANEL_HEIGHT`; `useEffect` z logiką doboru `bottomPanel` (F7.1/F7.2); blok dolnego panelu (markup, `panelTitle`, `panelIcon`, `handleBack`, `<Cross1Icon>`); import `TemplateSettings`/`PageSettings`/`ThemeEditor` przenosi się do `TemplateSettingsTab`.
- **Nowa treść** (sekcja górna):
  ```
  content =
    mode === "seo"      → <SeoLeftPanel />
    selectedBlock       → <BlockInlineSettings />   (inline, patrz niżej)
    mode === "template-settings" → <TemplateSettingsTab />
    else                → <SectionsTab />
  ```
- Nagłówek nad treścią:
  - tryb Sekcje + brak bloku → nazwa strony (jak dziś) + separator;
  - blok wybrany → nagłówek z `BlockBreadcrumb` + `BlockQuickActions` + przycisk X (`setBlockIds([])`) — przenosimy z dolnego panelu;
  - tryby ⚙ / SEO → bez nagłówka (jak dziś).
- `Suspense` wokół treści (SettingsPanel ma lazy AI panel).

### 6.3 `layouts/left-panel/theme-tab.tsx` → `TemplateSettingsTab`
- Import/eksport: `export const TemplateSettingsTab` + `export const ThemeTab = TemplateSettingsTab` (alias dla `mobile-bottom-sheet.tsx`).
- **Stan akordeonu**: lokalny `useState<string[]>` (wartości otwartych itemów), Radix `Accordion type="multiple"` (sterowane).
  - Init: `["page", "colors"]` (sekcja kontekstu + Kolory).
  - „Zmień" w karcie „Aktywny motyw" → `setOpen(["page","colors"])` + `scrollIntoView` na item `colors`.
- **Struktura**:
  - Karta „Aktywny motyw" (Jasny/Ciemny) — z `useDarkMode`, jak dziś.
  - Sekcja kontekstu (nagłówek `t("Page")` / `t("Template")`):
    - `editorContext.type === "page"` → item „Ustawienia strony" z `<PageSettings embedded />`
    - `editorContext.type === "template"` → item „Ustawienia szablonu" z `<TemplateSettings embedded />`
    - brak kontekstu (np. `pageId === ""`) → item renderuje pustkę jak dziś w PageSettings.
  - Sekcje `PODSTAWY / KOMPONENTY / MARKA` (nagłówki jak dziś `SectionHeader`, `getThemeGroupsBySection`).
    - Każda grupa = AccordionItem; trigger = styl `ThemeGroupRow` (ikona + label + badge „Wkrótce" dla `icons` + ChevronDown zamiast ChevronRight).
    - Kontent: `<ThemeGroupContent groupId={group.id} />` (pkt 6.4).
  - Stopka: „Zmiany motywu dotyczą wszystkich stron".
- `selectedThemeGroupAtom` zostaje (highlight aktywnej grupy lub future) — nie jest już potrzebny do nawigacji.

### 6.4 `layouts/theme/theme-editor.tsx`
- Wyodrębnić `export const ThemeGroupContent = ({ groupId }: { groupId: string })` = obecny `renderContent()` switch.
- `ThemeEditor` (kompatybilność) = wrapper: nagłówek + `ThemeGroupContent groupId={selectedGroup}`.

### 6.5 `layouts/right-panel/page-settings.tsx` — prop `embedded`
- `embedded` ⇒ root: `flex flex-col` (zamiast `flex h-full flex-col`); `TabsList` zakładki: **Ogólne | Dostęp** (jedynie `Access`) — **bez „SEO"**; `useState` init `"general"`.
- Gdy `embedded`, `Tabs` nie wymusza `flex min-h-0 flex-1`; scroll odbywa się w akordeonie.
- Stopka Zapisz/Anuluj zostaje (wewnątrz itemu); logika `dirty`/`handleSave` bez zmian.

### 6.6 `layouts/right-panel/template-settings.tsx` — prop `embedded`
- Analogicznie: bez `h-full`, bez wewnętrznych `overflow-y-auto`; cały formularz płynie w akordeonie.

### 6.7 `layouts/mobile/mobile-bottom-sheet.tsx`
- Bez zmian kodu (import `ThemeTab` dalej działa dzięki aliasowi). Sheet renderuje akordeon i `SettingsPanel` — nic nie psuje.

### 6.8 i18n — klucze
- en.json (SDK) nowe/doprecyzowane:
  - `"Page": "Page"` (styl nagłówka sekcji),
  - `"Page settings": "Page settings"` (już jest),
  - `"Custom CSS": "Custom CSS"` **jeśli** dodamy grupę (w tym planie: nie),
- pl.json (aplikacja) nowe:
  - `"Page": "STRONA"`,
  - `"Template": "SZABLON"` (klucz istnieje jako `"Szablon"` — dodajemy wersję nagłówkową),
  - ewentualnie `"Theme settings": "Ustawienia motywu"`.
- `i18n.test.ts`: dodać powyższe do `THEME_TAB_KEYS`/`LEFT_PANEL_KEYS`; test o pustych wartościach pl musi przejść.

## 7. UX / wygląd / style (specyfikacja wizualna)

### 7.1 Style tokens (kanon spójny z obecnym `theme-tab.tsx` + `builder-left-panel.tsx`)

| Element | Klasy tokenowe |
|---|---|
| Root akordeonu | `flex h-full min-h-0 flex-col` |
| Karta „Aktywny motyw" | `shrink-0 rounded-md border border-gray-200 bg-gray-50 p-2` |
|  — caption | `text-[11px] text-muted-foreground` |
|  — nazwa motywu | `truncate text-[13px] font-medium text-gray-900` |
|  — przycisk „Zmień" | `Button variant="ghost" size="sm" className="h-6 shrink-0 px-2 text-xs"` |
| Kontener scrollu | `no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2` |
| Nagłówek sekcji (`SectionHeader`) | `mb-1 mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-1` |
| Trigger akordeonu | `gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] font-normal text-gray-900 hover:bg-gray-100 hover:no-underline data-[state=open]:bg-gray-100 [&[data-state=open]>svg]:rotate-180` |
| Ikona grupy | `h-3.5 w-3.5 shrink-0 text-gray-500` |
| Label grupy | `min-w-0 flex-1 truncate` |
| Badge „Wkrótce" | `shrink-0 rounded-full bg-muted px-1.5 py-px text-[9px] font-medium uppercase text-muted-foreground` |
| Kontent akordeonu | `px-1.5 pb-2 pt-1` |
| Stopka info | `shrink-0 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-2 text-[11px] leading-snug text-sky-800` |
| Nagłówek trybu Sekcje | `px-4 pt-4 pb-3` + `h1 text-[14px] font-semibold leading-5 text-[#303030]` |
| Rozdzielacz | `h-px bg-[#EBEBEB]` |
| Obwódka panelu | `border-r border-gray-200 bg-white text-gray-900` |

### 7.2 Interakcje / micro-interactions

1. **Trigger akordeonu** (Chevron): strzałka `rotate-180` przy `data-[state=open]`;
   cały wiersz = obszar kliknięcia (flex-1, gap-2).
2. **Stany** (wzór Shopify — subtelny szary fill, bez ramki): otwarty trigger →
   `bg-gray-100`; zamknięty → jedynie `hover:bg-gray-100`.
3. **Scroll**: akordeon scrolluje wewnątrz `overflow-y-auto`; karta „Aktywny motyw"
   i stopka pozostają **przypięte** (`shrink-0`).
4. **„Zmień"**: `requestAnimationFrame` → `scrollIntoView({ behavior:"smooth", block:"start" })`
   na `#theme-group-colors` (element z `id="theme-group-colors"`).
5. **Blok wybrany** (tryb ⚙/Sekcje): treść = `SettingsPanel`; nagłówek =
   `BlockBreadcrumb` + `BlockQuickActions` + przycisk X (`setBlockIds([])`). Po X
   powrót do akordeonu / drzewa — bez animacji slide-up.
6. **Tryb SEO**: tylko `SeoLeftPanel`, bez nagłówka strony; stopka „Zmiany motywu
   dotyczą wszystkich stron" **nie** występuje (tylko w ⚙).

### 7.3 Spacje / densność (wzór Shopify — gęste ustawienia)

- Trigger `px-1.5 py-1.5` (~28–30px wiersz), kontent `px-1.5`, tekst 13px, ikony 3.5.
- Brak marginesów między AccordionItem (ciągły hover między wierszami).
- Nagłówki sekcji (`mt-3`, uppercase, tracking-wide) oddzielają bloki bez linii.

### 7.4 Pusty stan / placeholder

- Grupa `icons` (MARKA) → `PlaceholderEditor` + badge „Wkrótce" (niezmienione).
- `pageId === ""` w sekcji STRONA → „Select a page to view its settings"
  (muted, wycentrowane, `py-4`) zamiast pustego `PageSettings`.

### 7.5 A11y

- Radix Accordion: `aria-expanded`/`aria-controls`, nawigacja klawiaturą (Tab/Enter/
  Spacja/strzałki).
- `ChevronDown` jako semantyczna ikona triggera.
- Przycisk X na bloku ma `aria-label={t("Close")}`.
- Po „Zmień" fokus zostaje na przycisku; nie przenosimy fokusu na akordeon.

## 8. Zachowania brzegowe (edge cases)

1. **Blok wybrany w trybie ⚙** → `SettingsPanel` inline („blok zawsze wygrywa"); po `X` wracamy do akordeonu.
2. **Blok wybrany w trybie SEO** → pokazuje się `SeoLeftPanel` (SEO ma priorytet; blok nie podmienia go). Zgodne z F7.
3. **Zmiana strony/szablonu przy otwartym akordeonie** → sekcja kontekstu przeładowuje się sama (PageSettings czyta `useCurrentActivePage`); stan akordeonu zostaje.
4. **`editorContext.type === "page"`, ale `pageId === ""`** → item pokazuje „Select a page to view its settings".
5. **Brak zaznaczonego bloku a powrót z marki „theme" na mobile** — mobile bez zmian.
6. **`useLeftPanelBottom` nie jest nigdzie importowany poza `builder-left-panel` i `theme-tab`** — po zmianie nie zostają osierocone referencje (zweryfikowane greppem).

## 9. Testy / weryfikacja

- `pnpm --filter @chaibuilder/sdk test` (w tym `theme-groups.test.ts`, `i18n.test.ts`).
- `pnpm --filter @chaibuilder/sdk build` (tsc && vite).
- root `npm run typecheck`.
- Podgląd: `pnpm dev:builder` / `pnpm dev:sdk` + edytor.
- `graphify update .` po zmianach (AGENTS.md).

## 10. Uwagi / out of scope

- Nie dodajemy kategorii e-commerce z referencji Shopify (Koszyk, Ceny,
  Wyszukiwanie, Próbki...) — pozostają placeholdery docelowe.
- `rightPanelAtom` w `use-theme.ts` pozostaje (nieużywany w layouts).
- XPX: grupa `icons` nadal `kind: "placeholder"` ("Wkrótce").