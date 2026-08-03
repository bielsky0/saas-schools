# Moduł bloga i szablonów CMS — plan implementacji

> Źródła speca:
> - Wireframe: `docs/Blog i szablony.dc.html`
> - Specyfikacja UX/UI: „Zakładka Strony, Szablony i Moduł Bloga (Builder)"
>
> Każda faza = osobna sesja. Wpisuj postęp/odchyłki przy każdej fazie.

> ## ⚠️ PIVOT ARCHITEKTURY (2026-08-03)
>
> Faza 5 (inline editing) i Faza 3 (modal listy wpisów) zostają **zastąpione** nowym,
> **Shopify-style CMS**: posty edytuje się w **dashboardzie** (TipTap), a w builderze
> projektuje się tylko **layouty szablonów** z **dedykowanymi blokami blogowymi**
> (auto-bindowanymi z podglądu posta). Szczegóły: **`08-blog-cms-redesign.md`**.
>
> F1–F5 poniżej to historia implementacji (częściowo do usunięcia w F5.0). Nowe fazy:
> F5.0 (cleanup) → F5.1 (dashboard blog) → F5.2 (bloki blogowe) → F5.3 (podgląd posta)
> → F5.4 (strona bloga) → **F7 (lewy panel + AI drawer — na końcu)** → F5.5 (future: dynamiczne źródła).
>
> **F7 (przebudowa lewego panelu + AI drawer z prawej)** — na końcu, po blog CMS.
> Szczegóły: **`09-builder-left-panel-redesign.md`**.

## 1. Cel (historyczny)

Dodać do buildera ChaiBuilder pełny moduł CMS: **kolekcje w drzewie lewego panelu** (STRONY / SZABLONY (KOLEKCJE CMS) / SYSTEMOWE), **modal listy wpisów** (overlay nad canvasem), **edycję layoutu szablonu** (drag & drop, dziedziczona przez posty) oraz **tryb edycji treści wpisu** (inline editing, układ zablokowany).

Kluczowe założenie (historyczne): ochrona interfejsu buildera — zarządzanie listą postów odbywa się przez **Modal (nakładkę)**, a nie przez zmianę głównego widoku roboczego.

## 2. Utrwalone decyzje

- **Zmiany SDK** bezpośrednio w `packages/chaibuilder-sdk/` (fork), bez PR do upstream.
- **Kolekcje CMS zdefiniowane w kodzie** (config mapujący `pageType` → nazwa kolekcji + lista szablonów). Bez osobnej tabeli i bez UI zarządzania kolekcjami. *(do F1–F2; od F2.5 kolekcje per-tenant w tabeli `cms_collection`, zob. `07-collection-management.md`)*
- **Pełne wyłączenie DND** w trybie edycji treści — nowa flaga `editorMode: "layout" | "content"` w SDK (nie obejście na poziomie bloków).
- Szablony layoutu to **strony** (`pageType: "blog_post_template"` itp.) powiązane z postami przez nową kolumnę `page.templateId`.
- UI po polsku, fallback EN (i18n), zgodnie z `docs/editor-spec-implementation-plan.md`.
- Cykl pracy: zmiany w `packages/chaibuilder-sdk/src/` → `pnpm --filter @chaibuilder/sdk build` → `pnpm dev`.

## 3. Graficzny plan faz

```
Faza 1 ─── Backend: model danych (templateId) + API + config kolekcji
   │
Faza 2 ─── Lewy panel: drzewo kolekcji CMS (rozwijane listy)
   │
Faza 2.5 ─ Zarządzanie kolekcjami CMS (per-tenant, DB zamiast kodu)
   │
Faza 3 ─── Modal "Lista wpisów" + krok wyboru szablonu
   │
Faza 4 ─── Tryb edycji szablonu (layout, DND, mapowanie danych, SEO)
   │
Faza 5 ─── Tryb edycji treści wpisu (inline editing, układ zablokowany)
   │
Faza 6 ─── Integracja (editorMode atom, nawigacja, breadcrumb, statusy, polish)
```

Zależności: F2 i F3 zależą od F1; F4 i F5 zależą od F2 (wyzwalacz w drzewie) oraz od F1 (dane szablonu/postu); F6 zależy od F4+F5. F2.5 jest niezależna od F3–F6 i rozszerza F2 (nie zmienia formatu API dla nich).

## 4. Mapowanie spec → faza

| Wymóg speca | Faza |
|---|---|
| STRONY z wskaźnikiem statusu (Live/Robocza/Ukryta) | F2, F6 |
| SZABLONY (KOLEKCJE CMS) jako rozwijane listy (kolekcja → „Wszystkie wpisy" + warianty szablonów) | F2 |
| Zarządzanie kolekcjami przez tenanta (tworzenie/edycja/usuwanie, warianty szablonów) — spoza speca, F2.5 | F2.5 |
| Klik „Wszystkie wpisy" → otwiera bazę postów (bez zmiany widoku roboczego) | F3 |
| Klik „Szablon: X" → edytor layoutu z DND + placeholderami | F4 |
| Prawy panel szablonu: Układ, Elementy, Mapowanie danych, Domyślne SEO | F4 |
| Modal „Zarządzaj wpisami: Blog" (search, filtr szkiców, tabela, [+ Nowy wpis]) | F3 |
| Ścieżka A: „+ Nowy wpis" → krok wyboru szablonu (kafelki) → zamknięcie modala | F3 |
| Ścieżka B: klik wiersza → zamknięcie modala → tryb edycji treści | F3, F5 |
| Tryb edycji treści: Live Preview, brak DND, inline editing | F5 |
| Prawy panel posta: tytuł, slug, kategorie/tagi, thumbnail, zajawka, dropdown szablonu, status | F5 |
| Przełącznik statusu: Zapisz jako szkic / Opublikuj | F5, F1 |
| Breadcrumb w topbarze (Strona / Szablon / Wpis) | F6 |

## 5. Szacowany nakład

| Faza | Nakład |
|---|---|
| F1 Backend | 3–4h |
| F2 Lewy panel | 3–4h |
| F2.5 Zarządzanie kolekcjami | 7–8h |
| F3 Modal | 3–4h |
| F4 Edycja szablonu | 4–5h |
| F5 Inline editing | 4–5h |
| F6 Integracja | 2–3h |
| **Łącznie** | **~26–33h** |

## 6. Kluczowe pliki (referencje)

| Plik | Rola |
|------|------|
| `src/lib/db/schema/pages.ts` | Tabela `page` — dodanie `templateId` |
| `src/app/(builder)/editor/api/route.ts` | API buildera — nowe akcje kolekcji/szablonów |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | Zakładka Strony w lewym panelu |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/page-groups.ts` | Grupowanie STRONY/SZABLONY/SYSTEMOWE |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | Kompozycja lewy panel + canvas + prawy panel |
| `packages/chaibuilder-sdk/src/hooks/use-theme.ts` | `rightPanelAtom` — dodanie trybów `template`/`post` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/page-settings.tsx` | Wzorzec prawego panelu strony |
| `packages/chaibuilder-sdk/src/pages/client/components/page-manager/` | Komponenty drzewa stron |
| `packages/chaibuilder-sdk/src/core/components/canvas/` | Canvas + system DND |
| `src/lib/blocks-library.ts` | Biblioteka szablonów (5 blogowych) |
| `src/lib/block-data.ts` | Dane bloga (`getBlogPosts`, `getBlogPostBySlug`) |

## 7. Postęp implementacji

> Zasada: wpisuj postęp/odchyłki przy każdej zakończonej fazie.
>
> **F1–F5 to historia.** Od 2026-08-03 obowiązuje nowa architektura (patrz `08-blog-cms-redesign.md`).

| Faza | Status | Data | Odchyłki / notatki |
|------|--------|------|--------------------|
| F0 — Audyt | ✅ | 2026-08-02 | 9 plików zweryfikowanych — stan zgodny z dokumentacją |
| F1 — Backend | ✅ | 2026-08-02 | **Brak FK** na `templateId` (patrz niżej); szablony-pages tworzone leniwie |
| F2 — Lewy panel | ✅ | 2026-08-02 | `GET_COLLECTIONS` rozszerzony o `templatePageType`; `toChaiPage` zwraca `status` |
| F2.5 — Zarządzanie kolekcjami | ✅ | 2026-08-02 | Patrz `07-collection-management.md` — zrealizowano (odchyłki poniżej) |
| F3 — Modal | ⚠️ superseded | 2026-08-02 | Zastąpiony dashboardem (F5.1) — do usunięcia w F5.0 |
| F4 — Edycja szablonu | ✅ | 2026-08-02 | Zostaje (baza dla F5.3). Patrz `04-template-editing.md` |
| F5 — Inline editing | ⚠️ superseded | 2026-08-02 | Zastąpiony blokami blogowymi + podglądem (F5.2/F5.3) — do usunięcia w F5.0 |
| F6 — Integracja | ⬜ | — | Na razie zawieszona (po nowej architekturze) |
| **F5.0 — Cleanup** | ✅ | 2026-08-03 | Usunięcie F3/F5 z SDK (patrz niżej) |
| **F5.1 — Dashboard Blog** | ✅ | 2026-08-03 | Lista + edytor posta (TipTap) + CRUD API (patrz niżej) |
| **F5.2 — Bloki blogowe** | ✅ | 2026-08-03 | Dedykowane bloki, tylko w szablonach bloga (patrz niżej) |
| **F5.3 — Podgląd posta** | ✅ | 2026-08-03 | Dropdown podglądu w TemplateSettings (patrz niżej) |
| **F5.4 — Strona bloga** | ⬜ | — | Listing + bloki listingu |
| **F5.5 — Dynamiczne źródła** | ⬜ | — | (future) |
| **F7 — Lewy panel + AI drawer** | ⬜ | — | Shopify-style: edycja w lewym panelu, AI z prawej (na końcu) |

### Odchyłki F1

1. **`page.templateId` bez FK do `page(id)`.** Spec zakładał `REFERENCES page(id) ON DELETE SET NULL`, ale wartością kolumny jest **klucz szablonu z `CMS_COLLECTIONS`** (np. `"tpl-blog-classic"`), a nie `page.id`:
   - klucze są współdzielone między tenantami, a `page.id` to UUID — szablon-podstrona (pageType `*_template`) powstaje **leniwie, per organizacja** (dopiero w F4 / `UPDATE_TEMPLATE`);
   - globalny FK zablokowałby `CREATE_COLLECTION_ITEM` zanim jakakolwiek strona-szablon istnieje.
   - Spójność wymuszamy na warstwie API: walidacja `templateId` przeciw `CMS_COLLECTIONS` w tej samej transakcji tenanta. Migracja dodaje zwykły indeks `page_template_id_idx`.
2. **Szablon-strona identyfikowany przez `(organizationId, pageType = *_template, slug = klucz szablonu)`** — nie przez `page.id`. `GET_TEMPLATE_DATA` szuka takiej strony; gdy nie istnieje, zwraca `page: null` + domyślny config z `getDefaultTemplateConfig()`. `UPDATE_TEMPLATE` tworzy ją lazily.
3. **Testy API** (`LIST_COLLECTION_ITEMS`, `CREATE_COLLECTION_ITEM`) — wyłącznie manualne QA (dotykają DB, poza zakresem Vitest). Vitest pokrywa config `CMS_COLLECTIONS` + czyste helpery.

### Odchyłki F2

1. **`GET_COLLECTIONS` rozszerzony o `templatePageType`.** Spec (02-left-panel.md) nie precyzował tego pola w odpowiedzi API, ale bez niego SDK nie potrafi odfiltrować stron-szablonów layoutu (`blog_post_template`, `course_template`) z drzewa stron. Dodano pole w `buildCollections()`.
2. **`toChaiPage` zwraca teraz `status`** (`"draft" | "published" | "archived"`). Potrzebne do rozróżnienia badge'y „Robocza" (draft) od „Ukryta" (archived) — samo `online: boolean` nie wystarcza.
3. **Dedykowane klucze i18n dla badge'ów statusu** (`Status live` / `Status draft` / `Status archived`) zamiast współdzielonych `"Live"` / `"Draft"`, bo te w `pl.json` mapują się na „Opublikowana" / „Wersja robocza" (kontekst prawego panelu) i nie pasują do krótkich badge'y w drzewie.
4. **Callbacki `onOpenPosts` / `onOpenTemplate` to na razie stuby** (`console.warn`) — właściwa implementacja (modal F3, tryb szablonu F4) w kolejnych fazach. Interfejs komponentu `CollectionTreeGroup` już je udostępnia.

### F2.5 — Zarządzanie kolekcjami CMS (plan)

Pełny plan w `07-collection-management.md`. Utrwalone decyzje (2026-08-02):

1. **UI w lewym panelu buildera** (fork SDK) — nie w dashboardzie.
2. **Kolekcje per-tenant** — nowa tabela `cms_collection` z `organizationId`, RLS jak `page`.
3. **Pełne zastąpienie `CMS_COLLECTIONS`** bazą danych — hardcoded config tylko jako seed dla migracji 0077 i `createOrganization()`.
4. **`api id` kolekcji = stabilny `key`** (np. `"blog"`), nie UUID — backward compat z istniejącym SDK/API.
5. **Nowe akcje API**: `CREATE/UPDATE/DELETE_COLLECTION` + `CREATE/UPDATE/DELETE_COLLECTION_TEMPLATE`.
6. **`DELETE_COLLECTION` blokowane gdy `postCount > 0`** (ochrona przed orphan pages).
7. F3–F6 działają bez zmian — F2.5 nie zmienia formatu odpowiedzi `GET_COLLECTIONS`.

### F2.5 — odchyłki od planu

1. **Brak triggera `updated_at`.** Plan zakładał trigger wywołujący `update_updated_at_column()`, ale ta funkcja nie istnieje w tym repo (żadna tabela jej nie używa). `updatedAt` aktualizuje Drizzle `$onUpdate()` w schema oraz ręcznie w akcjach API — spójnie z resztą bazy.
2. **Akcje `UPDATE_COLLECTION_TEMPLATE` / `DELETE_COLLECTION_TEMPLATE`** przyjmują `templateId` na top-level (obok `collectionId`), nie w zagnieżdżonym obiekcie.
3. **`GET_BUILDER_PAGE_DATA`** zgeneralizowany: wzbogaca dane dla dowolnej kolekcji (`getCollectionByPageType`), nie tylko `blog_post`.
4. **Nazwa pomocnicza:** `getTemplateOf`/`getTemplateNameOf` (przyjmują obiekt kolekcji, nie ID) — zero dodatkowego round-tripu przy już załadowanej kolekcji.

### F3 — Modal (odchyłki od planu)

1. **Backend gotowy z F1** — `LIST_COLLECTION_ITEMS` i `CREATE_COLLECTION_ITEM` już istniały; F3 to wyłącznie frontend (SDK). Dodano brakujące stałe w SDK `ACTIONS.ts` (`LIST_COLLECTION_ITEMS`, `CREATE_COLLECTION_ITEM`) oraz typ `CmsCollectionItemVm` w `src/types/collections.ts`.
2. **Licznik „X z N"** — backend nie zwraca `total` (tylko `items`), więc `N` to `collection.postCount` z `GET_COLLECTIONS`. Przy search/filtrze `N` pozostaje całkowitą liczbą wpisów kolekcji.
3. **Overlay `bg-black/40`** — zbudowano `DialogContent` z surowych prymitywów Radix (`DialogPrimitive.Content` + własny `DialogOverlay`), bo shadcn `DialogContent` domyślnie ma `bg-black/80`.
4. **Nawigacja do wpisu** — `navigateToPost(pageId)` (w `use-posts-manager.ts`) używa globalnego `useSearchParams` + `navigateToPage` (ten sam mechanizm co `pages-tab.tsx`); modal zamykany przed nawigacją. F5 przejmie tryb edycji treści po tym URL.
5. **Błąd tworzenia wpisu** renderowany inline w kroku wyboru szablonu (czerwony alert pod kafelkami) — modal nie zamyka się.

### F4 — Edycja szablonu (odchyłki od planu)

1. **`use-editor-mode.ts` już istniał** jako `editorModeAtom<'edit' | 'view'>` (tryb preview/eksport). Nowy kontekst page/template/post dodano jako **osobny eksport** `editorContextAtom` + `useEditorContext` w tym samym pliku — bez łamania istniejącego `useEditorMode`.
2. **Swap bloków przez prop `blocks`** zamiast `setNewBlocks`: tryb szablonu ładuje bloki do współdzielonego `presentBlocksAtom` surowym setterem (`setBlocks` z `useBlocksStore`), bo prop `blocks` przekazywany do `ChaiBuilderEditor` nie zmienia się przy przejściu page→template (URL `page` ten sam) — efekt ładowania w `chaibuilder-editor.tsx` nie nadpisuje bloków szablonu. Snapshot bloków strony robiony w `chaibuilder-pages.tsx` przez `getCurrentBlocks()`; przywracany przy wyjściu.
3. **Autozapis szablonu** — przekierowanie w `onSave` prop (`chaibuilder-pages.tsx`): gdy `editorContext.type === "template"` → `UPDATE_TEMPLATE` (zamiast `UPDATE_PAGE`), z `mutateAsync` z `useUpdateTemplate`. Cały łańcuch autozapisu (`userActionsCount` → `useAutoSave` → `useSavePage`) działa bez zmian; throttle 3s i `saveState` współdzielone.
4. **`TemplateSettings`** zrealizowany z 4 sekcjami (Układ, Elementy, Mapowanie read-only, Domyślne SEO) + bannerem „zmiany zobaczy N wpisów" + CTA „Zobacz wpisy w tym szablonie". Config zapisywany debounced (1000ms, `useDebouncedCallback` z `@react-hookz/web`).
5. **Banner trybu szablonu** nad canvasem w `canvas-area.tsx` (nie w `static-canvas.tsx`) — warstwa jest wyżej, nie wpływa na DND/iframe.
6. **Nakładki bindingów** (`new-blocks-renderer.tsx`): overlay „⛁ {pole}" renderowany tylko gdy blok ma `dataMapping`/`dataField` — w F4 bloki jeszcze ich nie mają (mapowanie read-only), mechanizm gotowy na F5.
7. **`changePage` w `pages-tab.tsx`** resetuje teraz `editorContext` do `{ type: "page", pageId }` — inaczej po wyjściu z szablonu kontekst zostawałby `template` i canvas pokazywałby nie te bloki.
8. **Aktywacja panelu**: klik „Szablon: X" ustawia `editorContext` + `rightPanel` na `"template"`; `builder-layout.tsx` renderuje `TemplateSettings`. Auto-switch `template`→`block` przy zaznaczeniu bloku (jak dla `page`).
9. **i18n**: 17 nowych kluczy w `en.json` + `pl.json`, pokryte testem `TEMPLATE_SETTINGS_KEYS` w `i18n.test.ts`. Dodano flat `"Layout"` (wcześniej tylko `layout.heading`).

### F5 — Inline editing (odchyłki od planu)

1. **Inline editing oparty o istniejący `WithBlockTextEditor` (dblclick)** zamiast "zawsze-contentEditable": w trybie treści ten sam edytor nadpisuje zapis do `pageContent` (zamiast blocks store) przez `updatePostContent`. DoD „Tytuł i akapity edytowalne inline (contentEditable), zapis po onBlur" jest spełniony — `MemoizedEditor` używa `contentEditable: true`, a zamknięcie (`onBlur`) zapisuje do pola.
2. **Live źródło prawdy: `postContentAtom`** (`src/hooks/use-post-content.ts`) współdzielony przez renderer bloków, inline editing i `PostSettings` — dzięki temu „zmiana tytułu na canvasie aktualizuje pole w prawym panelu i vice versa" działa bez refetchu. Renderer nadpisuje propy mapowanych bloków z atomu (`new-blocks-renderer.tsx`).
3. **Mapa slotów dwukierunkowa**: `post-content-transform.ts` buduje `{ slotToBlockId, blockIdToField, blockIdToProp }`. Forward (load): pierwszy blok pasującego typu per slot (albo atrybut `dataMapping`/`dataField` jeśli obecny); backward (save): `blockId → field → pageContent[field]`. Pola złożone (`author+date`) pomijane (brak pola w `PostContent`).
4. **Slug/prefiks**: prefiks `/blog/` wyświetlany z `collection.id` (key kolekcji) — nie hardcoded.
5. **Klik w obraz otwiera media picker** przez `postImageEditAtom` + `PostImageEditorDialog` (renderowany poza iframe w `canvas-area.tsx`); wybór zapisuje URL do `pageContent[field]`.
6. **Obraz wyróżniający w `PostSettings`** przez istniejący `ImagePicker` (ten sam wzorzec co w innych panelach).
7. **Nowe klucze i18n** pokryte testem `POST_SETTINGS_KEYS` w `i18n.test.ts`; transformacja bloków pokryta `post-content-transform.test.ts` (5 przypadków, SDK vitest).
8. **Autozapis w trybie treści = no-op** (`onSave` w `chaibuilder-pages.tsx` zwraca `true` bez zapisu) — bloki na canvasie należą do szablonu i nie mogą trafić do `page.blocks` posta.

> **Superseded 2026-08-03.** F5 (inline editing) i F3 (modal) zostają zastąpione nową
> architekturą Shopify-style — patrz `08-blog-cms-redesign.md` (F5.0 cleanup → F5.4).

### F5.0 — Cleanup (odchyłki od planu)

1. **Większość elementów do usunięcia już nie istniała** — commit `48d0b10b` (cleanup)
   wyprzedził listę z `08-blog-cms-redesign.md`. Zostało tylko usunięcie stale typu
   `PostContent` z `packages/chaibuilder-sdk/src/types/collections.ts` (nieużywany,
   definicja przejęta przez `PageContent` w `src/lib/db/schema/pages.ts`).
2. **`POST_SETTINGS_KEYS`** nie istniało już w `i18n.test.ts` (usunięte wraz z
   panelami wcześniej) — graf (graphify) wskazywał stale wpis.
3. **Audyt:** dodano akcje `blog_post.create/update/delete` i target type `blog_post`
   do `src/features/admin/audit.ts` (plan nie zakładał audytu — dodane w F5.1).

### F5.1 — Dashboard Blog (odchyłki od planu)

1. **Slug bez wiodącego `/`.** Publiczny reader (`getBlogPostBySlug`) dopytywał
   `"/" + slug`, ale builder (`CREATE_COLLECTION_ITEM`) zapisuje slug bez slasha —
   legacy posty miały mieszane formaty. Dashboard zapisuje czysty slug; reader
   publiczny zmieniony na dokładne dopasowanie. `BlogList` linkuje `/blog/{slug}`.
2. **Publiczny blog renderuje `pageContent`.** `blog/[slug]/page.tsx` ma teraz gałąź:
   gdy post ma `pageContent.title/body` (nowa architektura) renderuje HTML body
   (prose + dangerouslySetInnerHTML); legacy posty z blokami wciąż przez
   `TenantPageRenderer`. To minimalna integracja F5.1 → „posty widoczne na
   publicznym blogu" (pełny listing to F5.4).
3. **Redirect z akcji create** — `next/navigation` redirect w server action jest
   rozwiązywany wewnętrznie (F4.6) i gubi prefiks locale → 404 na tencie. Cel
   prefiksowany jawnie `withLocale(...)`; e2e robi hard-navigation po redirect
   (dev-mode quirk).
4. **Obraz wyróżniający = URL input z podglądem** zamiast pełnego media pickera
   (osobny flow z `/dashboard/files` poza zakresem F5.1).
5. **Testy:** schema unit (`schema.test.ts`, 9 przypadków) + e2e
   (`e2e/blog-cms-dashboard.spec.ts` — create→publish→lista→public blog).
   Warstwa danych weryfikowana przez e2e (Vitest nie dotyka DB — konwencja repo).
6. **Brak routu `/new` jako osobnego pliku** — `[postId]/page.tsx` obsługuje
   `postId === "new"` (jeden plik zamiast dwóch).

### F5.2 — Bloki blogowe (odchyłki od planu)

1. **Atom w SDK, ale czytany przez hook z `@chaibuilder/sdk/runtime`.** Zgodnie z
   planem `blogPostPreviewAtom` + `BlogPostPreview` + `useBlogPostPreview` w
   `packages/chaibuilder-sdk/src/hooks/use-blog-preview.ts`, wyeksportowane przez
   `@chaibuilder/sdk/runtime` (bloki w głównej app nie mają zależności `jotai` —
   root `package.json` jej nie deklaruje). Bloki czytają dane przez hook, nie
   bezpośrednio `useAtomValue`.
2. **Publiczne renderowanie przez prop `data`.** Poza builderem bloki czytają
   `data` (serwerowe wzbogacanie wzorem `enrichBlocksWithData`), w builderze —
   `blogPostPreviewAtom`. W F5.2 atom zawsze `null` (ustawiany w F5.3), więc
   bloki renderują placeholder; wzbogacanie publiczne dociągnięte w F5.4.
3. **Filtrowanie w `default-blocks.tsx`.** Zamiast `add-blocks.tsx` — `DefaultChaiBlocks`
   (zakładka Blocks) filtruje bloki `group: "Blog"` po kontekście
   `editorContext.type === "template" && collectionId === "blog"`. Blok blogowy
   poza szablonem bloga dodatkowo renderuje placeholder (atom null).
4. **Wspólny helper `src/blocks/blog/shared.tsx`** — `useBlogPostData` +
   `BlogBlockPlaceholder` (placeholder „Wybierz post do podglądu") zamiast
   duplikacji logiki w 7 blokach.
5. **Testy:** SDK build + vitest (603 testy zielone), eslint czysty. Root
   `tsc --noEmit` ma 5 błędów w plikach spoza F5.2 (`e2e/*`, `admin-preview.test.ts`)
   — pre-existing (potwierdzone przez `git stash`).

### F5.3 — Podgląd posta (odchyłki od planu)

1. **Dwie akcje API zamiast jednej.** Plan dopuszczał nową akcję
   `LIST_BLOG_POSTS_FOR_PREVIEW` albo re-use `LIST_COLLECTION_ITEMS`. Użyto
   istniejącego `LIST_COLLECTION_ITEMS` (`collectionId: "blog"`) do lekkiej listy
   w dropdownie (id + title + status) + **nową akcję `GET_BLOG_POST_PREVIEW`** do
   pełnych danych wybranego posta (2-step fetch — pełne dane nie są ściągane dla
   całej listy).
2. **Backend `GET_BLOG_POST_PREVIEW`** reużywa `getBlogPost()` z
   `@/features/blog/data` (joiny `user` dla autora) i mapuje `pageContent`/`seo`
   na `BlogPostPreview`. Fallbacki: `excerpt ← seo.description`, `image ← seo.ogImage`,
   `datePublished ← publishedAt ?? updatedAt`.
3. **Sentinel `__none__` zamiast pustego stringa.** Radix Select nie przyjmuje
   pustej wartości itema, więc opcja „Brak" używa stałej `NONE_POST_VALUE =
   "__none__"`; wybór jej resetuje atom do `null` (placeholdery).
4. **Atom resetowany poza szablonem bloga.** `useEffect` w `TemplateSettings`
   ustawia `blogPostPreviewAtom = null`, gdy `collectionId !== "blog"` lub wybrano
   „Brak" — blogowe bloki pokazują placeholder poza szablonem bloga (zgodnie z
   odchyłką 3 w F5.2).
5. **i18n:** 4 nowe klucze w `en.json` (`Post preview`, `None`,
   `Choose a post to preview`, `Blog blocks render the selected post's data`).
6. **Nowe hooki SDK:** `use-collection-items.ts` (lista kolekcji, `staleTime: 30s`)
   i `use-blog-post-preview-data.ts` (pełne dane posta). Wzorzec identyczny z
   `use-collections.ts` / `use-template-data.ts` (react-query + `useFetch` +
   `useApiUrl`).
7. **Testy:** vitest zielone dla zmian; root `tsc --noEmit` ma te same 5
   pre-existing błędów (spoza F5.3); eslint czysty poza pre-existing
   `console.error` w `route.ts`.
