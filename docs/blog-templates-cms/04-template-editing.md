# Faza 4: Tryb edycji szablonu (layout)

## Cel

Tryb projektowania wyglądu dziedziczonego przez wszystkie wpisy kolekcji: kliknięcie „Szablon: X" w lewym panelu ładuje **Live Preview z placeholderami**, włącza **pełny Drag & Drop**, a prawy panel pokazuje ustawienia szablonu (Układ, Elementy, Mapowanie danych, Domyślne SEO). Zmiany w tym trybie wpływają na wszystkie posty przypisane do szablonu.

## Stan obecny

- `pageType: "template"` (MARK_AS_TEMPLATE) to inny koncept — nie jest szablonem layoutu postów.
- Canvas renderuje bloki z `blocksAtom`; DND zawsze aktywny; prawy panel przełącza się przez `rightPanelAtom` (brak trybu `template`).
- Istnieją 5 blogowych szablonów w `src/lib/blocks-library.ts`.

## 1. Nowy stan trybu edycji

**Plik:** `packages/chaibuilder-sdk/src/hooks/use-editor-mode.ts` (nowy)

```ts
export type EditorMode =
  | { type: "page"; pageId: string }
  | { type: "template"; templateId: string; collectionId: string }
  | { type: "post"; postId: string; templateId: string; collectionId: string };

const editorModeAtom = atom<EditorMode>({ type: "page", pageId: "" });
export const useEditorMode = () => useAtom(editorModeAtom);
```

**Wyzwalacz (F2):** `onOpenTemplate(templateId, collectionId)` → `setEditorMode({ type: "template", ... })`.

## 2. Prawy panel — `TemplateSettings`

**Plik:** `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/template-settings.tsx` (nowy)

### Rozszerzenie `rightPanelAtom`
`packages/chaibuilder-sdk/src/hooks/use-theme.ts:65`:
```ts
const rightPanelAtom = atom<"block" | "theme" | "ai" | "settings" | "design-tokens" | "page" | "template" | "post">("block");
```

### Struktura panelu (wg wireframe'a)

1. **Nagłówek:** „Szablon · {nazwa kolekcji}" / „{nazwa szablonu}" + „⋯".
2. **Układ:** segment control — `Jedna kolumna` | `Z sidebarem` → zapis `config.layout` (`UPDATE_TEMPLATE`).
3. **Elementy szablonu:** przełączniki `Obraz wyróżniający`, `Powiązane artykuły`, `Zapis do newslettera` → `config.elements`.
4. **Mapowanie danych:** lista `slot → pole`:
   - `Nagłówek H1 → Tytuł wpisu`
   - `Zdjęcie u góry → Obraz wyróżniający`
   - `Treść → Treść wpisu`
   - `Podpis pod tytułem → Autor + data`
   - (read-only w F4; edycja pól/`+ Dodaj` w dalszej iteracji)
5. **Domyślne SEO:** inputy `Wzór tytułu` (`[Tytuł wpisu] — Blog`) i `Wzór opisu` (`[Zajawka wpisu]`) → `config.seoDefaults`.
6. **Info banner:** „Zmiany w tym szablonie zobaczy {N} wpisów." (z `GET_COLLECTIONS.postCount`).
7. **CTA:** „Zobacz wpisy w tym szablonie" → otwiera modal (F3) z `collectionId`.

### Dane
- Hook `useTemplateData(templateId)` → `GET_TEMPLATE_DATA` (bloki + config).
- Hook `useUpdateTemplate()` → `UPDATE_TEMPLATE` (debounced save jak w `page-settings.tsx`).

## 3. Canvas w trybie szablonu

- Ładuje bloki szablonu do `blocksAtom` (z `GET_TEMPLATE_DATA.page.blocks`).
- **DND aktywny** — pełna edycja layoutu.
- **Banner informacyjny** (nad canvasem, `bg-blue-50 border-blue-200`):
  „◫ Edytujesz layout szablonu — zmiany zobaczy {N} wpisów. Dane to placeholdery."
- Bloki mapowane pokazują binding — nakładka „⛁ {pole}" na bloku (renderowana przez `TemplateBlockOverlay`).
- Placeholdery: treść `GET_BUILDER_PAGE_DATA` z `pageType: blog_post` — zastąpienie w blokach tytułu/obrazu/tekstu wartościami sample.

### Renderowanie bindings
- W `chai-canvas.tsx` lub przez wrapper bloku: jeśli `editorMode.type === "template"` i blok ma przypisany `dataMapping` → pasek z polem mapowania + dashed border.

## 4. DND i autozapis

- Zmiany bloków zapisują się przez istniejący autozapis (`UPDATE_PAGE` → ale dla szablonu przez `UPDATE_TEMPLATE` — sprawdzić ścieżkę zapisu i przekierować gdy `editorMode.type === "template"`).
- Alternatywa: zapis wyłącznie przyciskami / `onSave` — ustalić w implementacji, zachowując spójność z trybem strony.

## 5. Definition of Done

- [ ] Klik „Szablon: X" w drzewie otwiera tryb szablonu (canvas + prawy panel).
- [ ] Prawy panel szablonu: Układ (single/sidebar), Elementy (przełączniki), Mapowanie danych, Domyślne SEO.
- [ ] Canvas pokazuje placeholdery + overlay „⛁ pole" na zmapowanych blokach.
- [ ] DND w pełni aktywny w trybie szablonu.
- [ ] Banner „zmiany zobaczy N wpisów".
- [ ] „Zobacz wpisy w tym szablonie" otwiera modal F3.
- [ ] Zmiany layoutu zapisują się (`UPDATE_TEMPLATE`).

## 6. Testy

### Manualne QA
- [ ] Przełączenie `Jedna kolumna` ↔ `Z sidebarem` odświeża canvas (sidebar widoczny/ukryty).
- [ ] Przełączniki Elementów dodają/ukrywają sekcje (thumbnail, related, newsletter).
- [ ] Zmiana w szablonie nie psuje bloków istniejących postów (dziedziczenie dopiero w F5).
- [ ] Wzorce SEO widoczne w preview.
- [ ] Nawigacja: szablon → strona → szablon przywraca właściwe bloki.

## 7. Pliki

| Plik | Akcja |
|------|-------|
| `packages/chaibuilder-sdk/src/hooks/use-editor-mode.ts` | **Nowy** — atom `EditorMode` |
| `packages/chaibuilder-sdk/src/hooks/use-theme.ts` | **Zmiana** — `rightPanelAtom` + `template`/`post` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/template-settings.tsx` | **Nowy** |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | **Zmiana** — warunek `panel === "template"` |
| `packages/chaibuilder-sdk/src/pages/hooks/pages/use-template-data.ts` | **Nowy** — `GET_TEMPLATE_DATA` |
| `packages/chaibuilder-sdk/src/core/components/canvas/` | **Zmiana** — banner trybu szablonu + overlay bindingów |
| `src/lib/cms-collections.ts` | **Zmiana** — (opcjonalnie) seed bloków szablonów z `blocks-library.ts` |

## 8. Szacowany nakład

4–5h — panel szablonu, canvas z placeholderami, autozapis szablonu.

## 9. Status realizacji (2026-08-02)

Zrealizowano w całości. Odchyłki i szczegóły: `README.md → F4 — Edycja szablonu (odchyłki od planu)`.

Kluczowe pliki utworzone/zmienione:

| Plik | Rola |
|------|------|
| `packages/chaibuilder-sdk/src/pages/hooks/pages/use-template-data.ts` | **Nowy** — `GET_TEMPLATE_DATA` |
| `packages/chaibuilder-sdk/src/pages/hooks/pages/use-update-template.ts` | **Nowy** — `UPDATE_TEMPLATE` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/template-settings.tsx` | **Nowy** — prawy panel szablonu |
| `packages/chaibuilder-sdk/src/hooks/use-editor-mode.ts` | `editorContextAtom` + `useEditorContext` |
| `packages/chaibuilder-sdk/src/pages/chaibuilder-pages.tsx` | swap-in/swap-out bloków + `onSave` → `UPDATE_TEMPLATE` |
| `packages/chaibuilder-sdk/src/core/components/canvas/canvas-area.tsx` | banner trybu szablonu |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/new-blocks-renderer.tsx` | overlay bindingów „⛁ pole" |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | switch `"template"` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | `handleOpenTemplate` + `activeTemplateId` + reset kontekstu |
| `packages/chaibuilder-sdk/src/pages/constants/ACTIONS.ts` | `GET_TEMPLATE_DATA`, `UPDATE_TEMPLATE` |
| `packages/chaibuilder-sdk/src/types/collections.ts` | `TemplateConfig`, `TemplateDataVm` |

Weryfikacja: `pnpm --filter @chaibuilder/sdk build` ✅, `pnpm --filter @chaibuilder/sdk test` (603 passed) ✅, `pnpm build` (Next.js) ✅, test i18n F4 ✅. Typecheck ma 5 pre-existing errors (e2e/admin-preview), niezwiązanych z F4.
