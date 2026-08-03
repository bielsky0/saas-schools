# Faza 5: Tryb edycji treści wpisu (inline editing)

> **⚠️ Superseded 2026-08-03.** Zastąpiony dedykowanymi blokami blogowymi +
> podglądem posta w szablonie (F5.2/F5.3). Kod (content mode, dataMapping,
> PostSettings) jest do usunięcia w F5.0. Patrz `08-blog-cms-redesign.md`.

## Cel

Tryb stricte do pisania treści, bez ryzyka zepsucia layoutu: canvas pokazuje **Live Preview konkretnego posta** z **układem zablokowanym** (wg wybranego szablonu), użytkownik edytuje bloki tekstowe **inline** (klik → pisanie), obraz przez media picker, a prawy panel zawiera czyste metadane CMS (tytuł, slug, szablon, kategorie/tagi, thumbnail, zajawka, status).

## Stan obecny

- Posty otwierają się w pełnym builderze z DND (brak trybu treści).
- `rightPanelAtom` nie ma trybu `post`.
- Canvas nie wspiera `contentEditable` dla danych z bazy; brak blokady DND.

## 1. Wejście w tryb

**Wyzwalacze:**
- Klik wiersza w modalu (F3, Ścieżka B) → `setEditorMode({ type: "post", postId, templateId, collectionId })`.
- Utworzenie nowego wpisu (F3, Ścieżka A) → jw. dla nowego posta.

## 2. Prawy panel — `PostSettings`

**Plik:** `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/post-settings.tsx` (nowy)

### Struktura (wg wireframe'a)

1. **Nagłówek:** „Wpis · {status}" / „Ustawienia wpisu" + „⋯".
2. **Tytuł artykułu** — input → `UPDATE_PAGE_METADATA` (title).
3. **Adres URL (slug)** — prefiks `/blog/` + input → slugify na żywo.
4. **Szablon wpisu** — dropdown/segment control z szablonami kolekcji (F2: `GET_COLLECTIONS.templates`) → `UPDATE_PAGE { templateId }` → przeładowanie layoutu (zachowując dane treści).
5. **Kategorie i tagi** — chipy + „＋ Dodaj" (dane w `seo` lub nowe pole; ustalić nośnik w F1 — propozycja: `page.seo.tags` lub `templateConfig`-like `pageContent` JSONB).
6. **Obraz wyróżniający (miniatura)** — media picker (istniejący `MediaManagerModal`) → zapis URL w `seo.ogImage`.
7. **Zajawka (excerpt)** — textarea.
8. **Akcje:** [Zapisz szkic] (status → draft) [Opublikuj] (status → published via `PUBLISH_CHANGES`).
9. **Link:** „‹ Wróć do listy wpisów" → otwiera modal F3.

## 3. Canvas w trybie posta

- Renderuje **bloki szablonu** (`GET_TEMPLATE_DATA`) jako strukturę + **dane posta** (`GET_PAGE_ALL_DATA` / `GET_BUILDER_PAGE_DATA`) wypełnione w bloki.
- **Banner:** „✎ Tryb edycji treści — układ zablokowany przez szablon „{nazwa}". Kliknij tekst i pisz."

### Wyłączenie DND (pełne)
**Flaga `editorMode: "layout" | "content"` w SDK** — gdy `"content"`:

- `packages/chaibuilder-sdk/src/core/components/canvas/canvas-area.tsx` — nie renderuje DND provider/overlay; wyświetla banner trybu.
- `dnd/use-block-drop.ts`, `dnd/use-block-drag-end.ts`, `dnd/use-block-drag-start.ts` — early return `if (editorMode === "content")`.
- `static/block-floating-actions.tsx` — ukrycie toolbaru (move/delete/duplicate).
- `static/add-block-at-bottom.tsx` — ukrycie „+".

> Fallback (gdyby zmiana DND okazała się zbyt inwazyjna): `canMove: false`, `canDelete: false` na wszystkich blokach + `pointer-events: none` na warstwie DND.

### Inline editing
- **Bloki tekstowe** (Heading, Paragraph, RTE, cytat): w trybie `"content"` ustaw `contentEditable` + `suppressContentEditableWarning`; na `onBlur` zapis do stanu → `UPDATE_PAGE` (debounced).
- **Obraz wyróżniający / thumbnail:** klik w puste miejsce → otwiera `MediaManagerModal`.
- **Pola mapowane** (tytuł, treść, autor, data): identyfikowane przez `dataMapping` z szablonu (F4) → powiązane z konkretnym polem posta.

### `ChaiBlockConfig`
`packages/chaibuilder-sdk/src/types/blocks.ts` — dodać `contentEditable?: boolean` (lub mechanizm per-blok przez flagę trybu) dla bloków tekstowych.

## 4. Zmiana szablonu w locie

- Dropdown w `PostSettings` zmienia `templateId` → pobiera nowy layout → renderuje ten sam zestaw danych treści (title, body, excerpt, image, tags) w nowym układzie.
- Zachować stan edycji (nie resetować pól przy przełączeniu).

## 5. Definition of Done

- [x] Klik wiersza modala otwiera tryb posta (canvas + prawy panel).
- [x] DND wyłączone w trybie treści (brak overlay, toolbarów, „+").
- [x] Tytuł i akapity edytowalne inline (contentEditable), zapis po `onBlur`.
- [x] Klik w obraz otwiera media picker.
- [x] Prawy panel: tytuł, slug `/blog/...`, szablon (dropdown), kategorie/tagi, thumbnail, zajawka.
- [x] [Zapisz szkic] / [Opublikuj] zmieniają status.
- [x] Zmiana szablonu w locie przebudowuje layout bez utraty treści.
- [x] „‹ Wróć do listy wpisów" otwiera modal.
- [x] Banner „układ zablokowany przez szablon".

## 6. Testy

### Manualne QA
- [x] Inline editing: zmiana tytułu na canvasie aktualizuje pole w prawym panelu i vice versa.
- [x] Zmiana szablonu w locie (Klasyczny → Wywiad) zachowuje body/excerpt/obraz.
- [x] Brak możliwości przeciągnięcia/usunięcia bloków w trybie treści.
- [x] Zapis szkicu nie zmienia statusu published.
- [x] Slug auto-generowany z tytułu, ręcznie edytowalny.

## 7. Pliki

| Plik | Akcja |
|------|-------|
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/post-settings.tsx` | **Nowy** — panel edycji treści posta |
| `packages/chaibuilder-sdk/src/hooks/use-post-content.ts` | **Nowy** — `postContentAtom`/`postSlotMapAtom`/`postImageEditAtom` + `usePostContent` (live source of truth, debounced save) |
| `packages/chaibuilder-sdk/src/lib/post-content-transform.ts` | **Nowy** — transformacja bloków szablonu + dwukierunkowa mapa slotów (testy w `post-content-transform.test.ts`) |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/post-image-editor-dialog.tsx` | **Nowy** — media picker dla obrazu wyróżniającego |
| `packages/chaibuilder-sdk/src/hooks/use-editor-mode.ts` | **Zmiana** — tryb `content` (typ `{ type: "post" }` już istniał z F4) |
| `packages/chaibuilder-sdk/src/pages/chaibuilder-pages.tsx` | **Zmiana** — snapshot/restore bloków dla post mode, ładowanie szablonu + transformacja, onSave no-op |
| `packages/chaibuilder-sdk/src/core/components/canvas/canvas-area.tsx` | **Zmiana** — banner trybu treści + `PostImageEditorDialog` |
| `packages/chaibuilder-sdk/src/core/components/canvas/dnd/drag-and-drop/hooks/*.ts` | **Zmiana** — guard `context.type === "post"` |
| `packages/chaibuilder-sdk/src/core/components/canvas/block-floating-actions.tsx` | **Zmiana** — ukrycie toolbaru w trybie treści |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/add-block-at-bottom.tsx` | **Zmiana** — ukrycie „+" w trybie treści |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/static-canvas.tsx` | **Zmiana** — wyłączenie DND handlers + drop indicator |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/chai-canvas.tsx` | **Zmiana** — klik w obraz → media picker w trybie treści |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/new-blocks-renderer.tsx` | **Zmiana** — override propów mapowanych bloków z atomu + brak drag handlers |
| `packages/chaibuilder-sdk/src/core/components/canvas/static/with-block-text-editor.tsx` | **Zmiana** — zapis do `pageContent` w trybie treści |
| `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/use-posts-manager.ts` | **Zmiana** — `enterPostMode` + `navigateToPost(postId, templateId)` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | **Zmiana** — warunek `panel === "post"` (już częściowo z F4) |

## 8. Szacowany nakład

4–5h — panel posta, wyłączenie DND, inline editing, zmiana szablonu.
