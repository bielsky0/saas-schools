# Faza 0: Stan obecny — audyt kodu przed implementacją

## Cel

Zebranie stanu faktycznego buildera przed wprowadzeniem modułu bloga i szablonów. Pozwala precyzyjnie zaplanować deltę (co zmieniamy, czego nie dotykamy).

## 1. Co już działa

### Lewy panel (zakładka Strony)
- `packages/chaibuilder-sdk/src/pages/client/layouts/builder-left-panel.tsx` — `Tabs` z 3 zakładkami: Sekcje / Motyw / Strony.
- `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` — search + filtr po typie strony, grupowanie przez `groupPages()`, drzewo przez `buildPageTree()`, akcje CRUD (add/edit/delete/duplicate/unpublish/markAsTemplate/unmarkAsTemplate).
- `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/page-groups.ts` — `groupPages()` dzieli na: `Pages` / `Templates` / `System pages`. Template = `pageType === "template"`. System = `pageType.isSystem`.

### API buildera
- `src/app/(builder)/editor/api/route.ts`:
  - `pageTypes = [{ key: "page" }, { key: "blog_post" }]` (linia 92–95).
  - `GET_WEBSITE_PAGES` → wszystkie strony (`toChaiPage`).
  - `GET_BUILDER_PAGE_DATA` → dane blogowe (`title`, `description`, `image`, `url`, `datePublished`) gdy `pageType === "blog_post"` (linia 209–232).
  - `CREATE_PAGE`, `UPDATE_PAGE`, `UPDATE_PAGE_METADATA`, `DELETE_PAGE`, `DUPLICATE_PAGE`, `TAKE_OFFLINE`, `MARK_AS_TEMPLATE`, `UNMARK_AS_TEMPLATE`, `PUBLISH_CHANGES`.
  - `GET_WEBSITE_DATA` zwraca `collections: []` (placeholder, linia 169).

### Tabela `page`
- `src/lib/db/schema/pages.ts`:
  - `pageType` tekstowy (default `"page"`), `status` (`"draft" | "published" | "archived"`), `parentId`, `isHome`, `seo` (JSONB), `blocks` (JSONB `ChaiBlock[]`), `publishedAt`.
  - **Brak** relacji post → szablon (brak `templateId`).

### Dane bloga
- `src/lib/block-data.ts` — `getBlogPosts()`, `getBlogPostBySlug()` (query po `page.pageType === "blog_post"`).
- `src/features/content/source.ts` — statyczny system treści (`listBlogPosts()`, `getBlogPost()`).
- `src/app/(builder)/editor/editor.tsx` — prefix `/blog/` dla slugów `blog_post` (linie 102, 111).

### Prawy panel
- `packages/chaibuilder-sdk/src/hooks/use-theme.ts:65` — `rightPanelAtom: "block" | "theme" | "ai" | "settings" | "design-tokens" | "page"`.
- `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` — warunek renderowania: `ai` → `AskAI`, `theme` → `ThemeEditor`, `page` → `PageSettings`, `selectedBlock` → `SettingsPanel`, inaczej `EmptyRightPanel`.
- `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/page-settings.tsx` — General (nazwa, slug, template/pageType, visible in menu, indexed), SEO (preview + title/description/canonical), Access (publication status, password "Coming soon"), akcje Duplicate/Delete.

### Canvas i DND
- `packages/chaibuilder-sdk/src/core/components/canvas/canvas-area.tsx` — `StaticCanvas` w flex column.
- `packages/chaibuilder-sdk/src/core/components/canvas/static/` — `static-canvas.tsx`, `chai-canvas.tsx`, `block-floating-actions.tsx`, `bubble-menu.tsx`, `add-block-at-bottom.tsx`, `resizable-canvas-wrapper.tsx`.
- `packages/chaibuilder-sdk/src/core/components/canvas/dnd/` — hooks `use-block-drag-end`, `use-block-drag-start`, `use-block-drop`, `use-drag-and-drop`.

### Bloki i biblioteka
- `src/blocks/index.ts` — 4 custom bloki Langlion + bloki blogowe (blog-hero, blog-quote, blog-gallery, blog-table, blog-author).
- `src/lib/blocks-library.ts` — 10 szablonów (5 Langlion + 5 Blog) zarejestrowanych przez `registerChaiLibrary("langlion", ...)`.

### Typy SDK
- `packages/chaibuilder-sdk/src/types/collections.ts` — `ChaiCollectoin { id, name, description?, filters?, sorts? }` (typ istnieje, API zwraca `[]`).
- `packages/chaibuilder-sdk/src/types/chaibuilder-editor-props.ts` — `ChaiBuilderEditorProps` z `pageTypes`, `collections`, `flags`, `onSave` itd.
- `packages/chaibuilder-sdk/src/pages/utils/page-organization.ts` — `ChaiPage { id, name, slug, pageType, parent, children?, isTemplate?, dynamic?, [key] }`, `buildPageTree()`, `filterPagesBySearch()`.

## 2. Czego brakuje (delta do zbudowania)

1. **Relacja post → szablon** — brak `page.templateId`. *(F1 ✅ — dodana kolumna, patrz sekcja 4)*
2. **Kolekcje CMS** — typ `ChaiCollectoin` istnieje, ale API zwraca `[]`, brak grupowania w drzewie. *(F1 ✅ — config `src/lib/cms-collections.ts` + `GET_COLLECTIONS`; grupowanie w drzewie to F2)*
3. **Modal listy wpisów** — nie istnieje; blog posty są dziś zwykłymi wierszami w Pages. *(F3)*
4. **Tryb edycji szablonu** — `pageType: "template"` istnieje (MARK_AS_TEMPLATE), ale nie jest szablonem layoutu dziedziczonym przez posty. *(F4; relacja przez `templateId` gotowa w F1)*
5. **Tryb edycji treści** — posty otwierają się dziś w pełnym builderze z DND; brak inline editing, brak zablokowanego układu. *(F5)*
6. **Prawy panel szablonu i posta** — brak `template` i `post` w `rightPanelAtom`. *(F6)*
7. **Statusy Live/Robocza/Ukryta** — strona ma `online` (z `status`), ale UI nie pokazuje statusów w drzewie wg speca. *(F2)*
8. **Flaga `editorMode`** — brak wyłączenia DND dla trybu treści. *(F6)*

## 3. Ryzyka techniczne

1. **Wyłączenie DND** — zmiany w kilku plikach systemu DND (`dnd/` hooks + `block-floating-actions`). Fallback: `canMove: false` / `canDelete: false` na wszystkich blokach + CSS `pointer-events: none` na overlay DND.
2. **Zmiana szablonu w locie** — podmiana bloków szablonu przy zachowaniu danych posta; testować z autozapisem SDK.
3. **Konflikt z istniejącym `pageType: "template"`** (MARK_AS_TEMPLATE) — nowy „szablon layoutu" to inny koncept. Używamy **osobnego pageType** (`blog_post_template` itp.), żeby nie kolidować z `TEMPLATE_PAGE_TYPE = "template"` w `page-groups.ts`.
4. **Restart dev servera** po zmianie `package.json` exports (Turbopack nie odświeża mapy subpath).

## 4. Referencje do kolejnych faz

Każda faza poniżej (F1–F6) zawiera: cel, stan obecny, specyfikację zmian, Definition of Done, testy oraz listę plików do utworzenia/zmiany.
