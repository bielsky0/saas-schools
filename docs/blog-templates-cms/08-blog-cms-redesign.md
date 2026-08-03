# Faza 5 REDUX: Blog CMS w stylu Shopify

> Status: **plan** — zatwierdzony 2026-08-03. Implementacja po porządkowaniu (F5.0).
>
> Decyzje użytkownika (2026-08-03):
> 1. Bloki blogowe widoczne **tylko** w szablonach bloga (nie globalnie).
> 2. Niepotrzebny kod z F3–F5 — **usuwać**.
> 3. Edytor treści w dashboardzie na **TipTap** (nowa zależność w głównej app, nie z SDK).
>
> Referencje UI (Shopify): zrzuty ekranu w tym katalogu —
> `Zrzut ekranu 2026-08-3 o 00.52.25.png`, `...00.52.47.png`, `...00.59.21.png`,
> `...01.02.54.png`.

## 1. Kontekst / dlaczego przebudowa

Obecny F5 (inline editing w builderze, dataMapping, content mode z zablokowanym DND,
modal listy wpisów) nie sprawdza się w praktyce:

- pisanie treści w builderze z zablokowanym layoutem jest nieintuicyjne,
- dataMapping slot→blok jest kruche (puste configi, brak przypisania bloków do pól),
- zarządzanie postami przez modal nakładający się na canvas jest topornie.

Nowy kierunek: **Shopify-style CMS**. Posty tworzy się w **dashboardzie** (czysto edytorsko),
a w **builderze** projektuje się wyłącznie **layouty szablonów**, w których dane posta
renderują **dedykowane bloki blogowe** (auto-bindowane z dynamicznego źródła). Cała edycja
układu to normalny drag & drop (bez trybu „content").

## 2. Architektura docelowa

```
Dashboard (app)                          Builder (ChaiBuilder)
┌───────────────────────────────┐       ┌─────────────────────────────────────┐
│ Sidebar → Blog                │       │ Lewy panel                          │
│ ┌───────────────────────────┐ │       │  Pages → CMS Collections → Blog     │
│ │ Lista postów              │ │       │   └ Szablon: Klasyczny  → edytor    │
│ │ Tytuł | Status | Data │… │ │       │   └ Wszystkie wpisy   → (link do     │
│ └───────────────────────────┘ │       │                        dashboardu) │
│ ┌───────────────────────────┐ │       │ ┌─────────────────────────────────┐ │
│ │ Edytor posta (TipTap)     │ │       │ │ Canvas — pełny DND              │ │
│ │ Tytuł  [________]         │ │       │ │ ┌─────────────────────────────┐ │ │
│ │ Treść  [RTE toolbar]      │ │       │ │ │ [PostTitle]   „Jakub"      │ │ │
│ │ Zajawka[________]         │ │       │ │ │ [PostImage]   🖼            │ │ │
│ │ Obraz  [picker]           │ │       │ │ │ [PostContent] „Lorem…"     │ │ │
│ │ SEO    [title, desc]      │ │       │ │ │ [PostAuthor]  Jan Kowalski │ │ │
│ │ Slug   /blog/[_____]      │ │       │ │ └─────────────────────────────┘ │ │
│ │ Status [draft/published]  │ │       │ │ Prawy panel                    │ │
│ └───────────────────────────┘ │       │ │  Szablon · Blog                │ │
└───────────────────────────────┘       │ │  Podgląd posta: [▼ Jakub]      │ │
                                        │ └─────────────────────────────────┘ │
                                        └─────────────────────────────────────┘
```

### Kluczowe założenia

1. **Post = czysta treść.** Post nie ma własnych bloków (`page.blocks = []`). Trzyma tylko
   metadane + `pageContent` (title, body HTML, excerpt, image, tags, categories, seo).
2. **Layout = szablon.** Layout daje strona-szablon (`pageType = *_template`), dziedziczona
   przez wszystkie posty kolekcji. Edytowana normalnie (DND) w builderze.
3. **Dane → bloki przez atom.** Bloki blogowe czytają `blogPostPreviewAtom` (Jotai) —
   ustawiany z danych wybranego posta do podglądu w prawym panelu szablonu.
4. **Brak dataMapping.** Mapowanie slotów/typów znika — dedykowane bloki mają dane
   „przyszyte" (post.title → BlogPostTitle, post.body → BlogPostContent itd.).
5. **Tylko blog.** Inne kolekcje CMS zostają w kodzie (F2.5) ale nie są rozwijane.
6. **Dynamiczne źródła danych (Shopify „insert dynamic source")** — osobna faza późniejsza.

## 3. Fazy

```
F5.0 ─── Cleanup: usunięcie starych F3–F5 (modal, content mode, dataMapping, PostSettings)
   │
F5.1 ─── Dashboard Blog: lista + edytor posta (TipTap) + CRUD API + sidebar nav
   │
F5.2 ─── Dedykowane bloki blogowe w ChaiBuilder (tylko w szablonach bloga)
   │
F5.3 ─── Podgląd posta w edycji szablonu (dropdown → blogPostPreviewAtom)
   │
F5.4 ─── Strona bloga (listing): typ strony + bloki listingu
   │
F5.5 ─── (future) Dynamiczne źródła danych / wiązanie propsów z danymi
```

## 4. F5.0 — Cleanup

Usunąć/oczyścić kod, który nie pasuje do nowej architektury.

### Do usunięcia (SDK `packages/chaibuilder-sdk/src/`)

| Plik / obszar | Dlaczego |
|---|---|
| `pages/client/components/posts-manager/` (modal F3: posts-manager-modal, posts-list, posts-list-row, template-selector, use-posts-manager, collection-manager?) | Zarządzanie postami przenosi się do dashboardu. `collection-manager.tsx` (F2.5) zostaje. |
| `pages/client/layouts/right-panel/post-settings.tsx` | Edycja treści posta przenosi się do dashboardu. |
| `hooks/use-post-content.ts` | Zastępuje go `use-blog-preview.ts` (atom podglądu). |
| `lib/post-content-transform.ts` (+ test) | Zastępują go dedykowane bloki blogowe. |
| `core/components/canvas/static/post-image-editor-dialog.tsx` | Niepotrzebny (obraz edytowany w dashboardzie). |
| `type: "post"` w `editorContextAtom` (use-editor-mode.ts) | Nie ma już trybu edycji treści w builderze. |
| Guardy `context.type === "post"` w DND / canvas / add-block / with-block-text-editor | Layout szablonu edytowany normalnie (DND aktywne). |
| `useUpdatePageContent` hook (pages/hooks/pages/) + `UPDATE_PAGE_CONTENT` akcja | Zastępuje go dashboard CRUD. |
| Klucze i18n `POST_SETTINGS_KEYS` (i18n.test.ts) | Usunąć wraz z panelami. |

### Zostaje

- `editorContext` **tylko** z `page` / `template` (usunąć `post`).
- `TemplateSettings` (prawy panel szablonu) — rozszerzony o sekcję „Podgląd posta" (F5.3).
- `CollectionTreeGroup` / `pages-tab` / `collection-manager` (F2.5) — mechanizm drzewa kolekcji.
- Backend `GET_TEMPLATE_DATA` / `UPDATE_TEMPLATE` / `GET_COLLECTIONS` / `cms_collection`.

## 5. F5.1 — Dashboard Blog

### Sidebar
- `src/components/sidebar.tsx`: nowy link `{ href: "/dashboard/blog", labelKey: "nav.blog", icon: Newspaper }` w nowej sekcji lub pod istniejącym CMS.

### Trasy
```
src/app/[locale]/(app)/dashboard/blog/
  page.tsx                 — lista postów (tabela, search, filtr statusu)
  [postId]/page.tsx        — edytor posta
  components/posts-table.tsx
  components/post-editor.tsx
  components/post-form.ts (schema + typy)
```

### Warstwa danych
```
src/features/blog/
  data.ts     — getBlogPostsForOrg, getBlogPost, createBlogPost, updateBlogPost, deleteBlogPost (soft)
  api.ts      — server actions (serwer/klient)
```

**Storage:** tabela `page`, `pageType = "blog_post"` (klucz z `cms_collection.blog`). Post:
`blocks = []`, `pageContent = { title, body, excerpt, image, tags, categories }`, `seo = { title, description, ogImage, noIndex }`, `slug`, `status`, `publishedAt`.

### Formularz posta (TipTap)
| Pole | Widget |
|------|--------|
| Tytuł | Input → auto-slug (dopóki nie ręcznie edytowany) |
| Slug | `/blog/` + input |
| Treść | **TipTap** (H1–H6, bold/italic/underline, linki, listy, blockquote, obrazki inline) |
| Zajawka | Textarea |
| Obraz wyróżniający | Media picker |
| Tagi / Kategorie | Chip input |
| SEO | title, description, canonical, noIndex |
| Status | Draft / Published (+ publikacja ustawia `publishedAt`) |
| Autor | ustawiany automatycznie z sesji |

### TipTap w głównej app
- `pnpm add @tiptap/react @tiptap/starter-kit` (+ linki, text-align, underline, image) w root package.json.
- Reuse wzorca z SDK (`core/rjsf-widgets/rte-widget/`) ale jako samodzielny komponent dashboardowy (bez Frame Provider).

## 6. F5.2 — Dedykowane bloki blogowe

### Nowe bloki w `src/blocks/`
```
src/blocks/blog/
  BlogPostTitle/     type: "BlogPostTitle"      → <h1>{preview.title}</h1>
  BlogPostContent/   type: "BlogPostContent"    → <div dangerouslySetInnerHTML={preview.body}>
  BlogPostImage/     type: "BlogPostImage"      → <img src={preview.image}>
  BlogPostAuthor/    type: "BlogPostAuthor"     → autor + data
  BlogPostDate/      type: "BlogPostDate"       → data publikacji
  BlogPostExcerpt/   type: "BlogPostExcerpt"    → <p>{preview.excerpt}</p>
  BlogPostTags/      type: "BlogPostTags"       → chipy tagów
```

- `group: "Blog"`, `category: "core"`.
- **Brak propsów treściowych** — tylko `styles` (do stylowania). Dane są auto-bindowane.
- Gdy `blogPostPreviewAtom = null` → renderuje placeholder „Wybierz post do podglądu".
- Rejestracja w `src/blocks/index.ts`.

### Widoczność tylko w szablonach bloga
- SDK: w panelu Sections/Blocks filtrować grupy po kontekście edytora.
- Dodatkowo/naprzemiennie: bloki blogowe renderują placeholder poza szablonem bloga,
  ale nie pokazują się na liście bloków poza nim.
- Wymaga drobnej zmiany w SDK (`add-blocks.tsx` / `libraries-panel.tsx`) — filtry po
  `editorContext.type === "template"` + kolekcja `blog`.

### Atom podglądu (SDK)
`packages/chaibuilder-sdk/src/hooks/use-blog-preview.ts`:
```ts
export type BlogPostPreview = {
  id: string;
  title: string;
  body: string;        // HTML
  excerpt: string;
  image: string;
  author: string;
  datePublished: string;
  tags: string[];
  categories: string[];
  slug: string;
};
export const blogPostPreviewAtom = atom<BlogPostPreview | null>(null);
```
Bloki blogowe czytają atom przez `useAtomValue`.

## 7. F5.3 — Podgląd posta w edycji szablonu

- W `TemplateSettings` (SDK right panel) nowa sekcja **„Podgląd posta"**:
  - Select z listą postów bloga (nowa akcja API `LIST_BLOG_POSTS_FOR_PREVIEW` albo re-use `LIST_COLLECTION_ITEMS`).
  - „Brak" → `blogPostPreviewAtom = null` (placeholdery).
  - Wybór posta → fetch danych → `blogPostPreviewAtom = post`.
- Canvas (renderer `new-blocks-renderer`) nic nie zmienia — bloki blogowe same czytają atom.
- Poza szablonem bloga atom jest `null` i bloki blogowe pokazują placeholder.

## 8. F5.4 — Strona bloga (listing)

- Nowy typ strony `blog_index` (osobna strona, edytowalna jak każda strona).
- Bloki listingu (grupa „Blog"):
  - `BlogPostList` — siatka kart postów z publicznego `getBlogPosts()`.
  - `BlogPagination` — paginacja (props: items per page).
  - `BlogHero` / `BlogSearch` — opcjonalne sekcje.
- Publiczny renderer (`blog/page.tsx`) używa strony `blog_index` (jeśli istnieje) z blokami
  wypełnionymi danymi postów, inaczej fallback do obecnego `<BlogList />`.

## 9. F5.5 — (future) Dynamiczne źródła danych

- Wzór Shopify: przy propsach treściowych (tekst, obraz, URL) przycisk „Insert dynamic source".
- Wybór źródła: `{ post.title, post.body, post.image, post.tags, ... }` + później kolekcje.
- Renderer rozwiązuje binding na render (podobnie do obecnego `{{...}}` w pageExternalData).
- Osobna sesja.

## 10. Definicja ukończenia (ogólna)

- [x] F5.0: stary F3–F5 usunięty, build i testy zielone.
- [x] F5.1: posty tworzone/edytowane w dashboardzie (TipTap), widoczne na publicznym blogu.
- [ ] F5.2: bloki blogowe w szablonach bloga, auto-render z podglądu.
- [ ] F5.3: dropdown podglądu posta w prawym panelu szablonu działa.
- [ ] F5.4: strona bloga (listing) edytowalna i renderowana publicznie.
- [ ] F5.5: (future) dynamiczne źródła.

## 11. Szacowany nakład

| Faza | Nakład |
|---|---|
| F5.0 Cleanup | 1–2h |
| F5.1 Dashboard Blog | 5–6h |
| F5.2 Bloki blogowe | 3–4h |
| F5.3 Podgląd posta | 2–3h |
| F5.4 Strona bloga | 3–4h |
| F5.5 (future) | 5–6h |
| **Łącznie (bez 5.5)** | **~14–19h** |
