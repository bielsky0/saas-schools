# Faza 1: Backend — model danych, API i config kolekcji CMS

## Cel

Fundament pod wszystkie kolejne fazy: relacja **post → szablon layoutu**, akcje API do listowania/zarządzania wpisami kolekcji oraz konfiguracja kolekcji CMS (mapowanie `pageType` → kolekcja + szablony).

## Stan obecny

- `page.pageType` obsługuje `"page"`, `"blog_post"`, `"template"` (MARK_AS_TEMPLATE) — brak relacji post → szablon.
- `GET_WEBSITE_DATA` zwraca `collections: []`.
- `pageTypes` w API: `[{ key: "page" }, { key: "blog_post" }]`.

## 1. Model danych

### Migracja: dodanie `templateId` do tabeli `page`

Nowa kolumna nullable, FK do `page.id` (self-reference jak `parentId`):

```sql
ALTER TABLE "page" ADD COLUMN "templateId" text REFERENCES "page"(id) ON DELETE SET NULL;
```

- Nullable → istniejące strony nie wymagają migracji danych.
- `ON DELETE SET NULL` → usunięcie szablonu nie kasuje postów (posty przechodzą do „bez szablonu" / można przypisać inny).
- Tenant isolation zachowana (ten sam `organizationId` co strona — walidacja po stronie API).

### Zmiana w `src/lib/db/schema/pages.ts`

```ts
templateId: text("templateId").references((): any => page.id, {
  onDelete: "set null",
}),
```

## 2. Konfiguracja kolekcji CMS

**Nowy plik: `src/lib/cms-collections.ts`** — jedyne miejsce definicji kolekcji (konfiguracja w kodzie, bez tabeli):

```ts
export type CmsTemplate = {
  id: string;              // == page.id szablonu layoutu (pageType: blog_post_template)
  name: string;            // "Klasyczny Artykuł"
  collectionId: string;    // "blog"
  layout: "single" | "sidebar";
};

export type CmsCollection = {
  id: string;              // "blog" — identyfikator kolekcji
  name: string;            // "Wpis na blogu"
  pageType: string;        // "blog_post" — typ stron wchodzących w kolekcję
  templatePageType: string;// "blog_post_template" — pageType stron-szablonów
  templates: CmsTemplate[]; // szablony layoutu wariantu (statyczna lista po stronie app)
};

export const CMS_COLLECTIONS: CmsCollection[] = [
  {
    id: "blog",
    name: "Wpis na blogu",
    pageType: "blog_post",
    templatePageType: "blog_post_template",
    templates: [
      { id: "tpl-blog-classic",  name: "Klasyczny Artykuł",    collectionId: "blog", layout: "single" },
      { id: "tpl-blog-interview",name: "Wywiad / Case Study",  collectionId: "blog", layout: "sidebar" },
    ],
  },
  {
    id: "courses",
    name: "Kursy / Nauczyciele",
    pageType: "course_entry",
    templatePageType: "course_template",
    templates: [
      { id: "tpl-course-default", name: "Domyślny", collectionId: "courses", layout: "single" },
    ],
  },
];
```

> Uwaga: w F1 szablony to **konfiguracja** (listy nazw/layoutów). Strony-szablony (z blokami) mogą powstawać w F4; seed/skopiowanie istniejących szablonów z `src/lib/blocks-library.ts` opisane w F4.

## 3. Nowe akcje API (`src/app/(builder)/editor/api/route.ts`)

### `GET_COLLECTIONS`
Zwraca kolekcje z licznikiem wpisów i szablonami.

```
→ GET_COLLECTIONS
← { collections: [{ id, name, pageType, postCount, templates: [{ id, name, layout }] }] }
```

Implementacja:
- Rozwiń `CMS_COLLECTIONS`, dla każdej policz wpisy: `SELECT count(*) FROM page WHERE organizationId = ? AND pageType = ? AND status != 'archived'`.

### `LIST_COLLECTION_ITEMS`
Lista wpisów kolekcji — dane dla modala.

```
→ { collectionId: "blog", search?: string, draftsOnly?: boolean }
← { items: [{ id, title, slug, templateId, templateName, status, createdAt }] }
```

Implementacja:
- Po `collectionId` → `pageType` z `CMS_COLLECTIONS`.
- Query: `WHERE organizationId = ? AND pageType = ? AND status != 'archived'` + `ILIKE` na tytule (`search`) + `status = 'draft'` (`draftsOnly`).
- `templateName` — mapowanie `templateId` przez config kolekcji; `null` gdy brak `templateId`.
- Sort: `createdAt DESC`.

### `CREATE_COLLECTION_ITEM`
Tworzy nowy wpis z przypisanym szablonem.

```
→ { collectionId: "blog", templateId: "tpl-blog-classic", title?: string }
← { page: { id, slug, title, templateId, ... } }
```

Implementacja (wzorowane na `CREATE_PAGE`):
- Walidacja: `collectionId` i `templateId` istnieją w `CMS_COLLECTIONS`; `templateId` należy do kolekcji.
- Insert: `pageType` = kolekcji `pageType`, `templateId`, `status: "draft"`, `blocks: []`, `slug` = slugify(tytułu) lub `"nowy-wpis"`.
- Unikalność `(organizationId, slug)` — przy kolizji dopisz sufiks `-2`, `-3`…

### `GET_TEMPLATE_DATA`
Pobiera bloki i konfigurację szablonu layoutu.

```
→ { templateId: "tpl-blog-classic" }
← { page: toChaiPage(szablon), config: { layout, elements, dataMapping, seoDefaults } }
```

- `layout: "single" | "sidebar"`, `elements: { thumbnail, related, newsletter }`, `dataMapping: [{ slot, field }]`, `seoDefaults: { titlePattern, descriptionPattern }` — F4 definiuje UI; API w F1 zwraca wartości domyślne z configu lub z kolumny `page.blocks` (do rozszerzenia o `templateConfig` JSONB).

### `UPDATE_TEMPLATE`
Zapisuje zmiany layoutu szablonu.

```
→ { templateId, blocks?, config? }
← { success: true }
```

- `blocks` → `UPDATE_PAGE` (istniejąca ścieżka).
- `config` → nowe pole `templateConfig` JSONB w tabeli (F4; w F1 przygotuj kolumnę `templateConfig jsonb` w migracji).

### Rozszerzenie `toChaiPage()`
Dodać `templateId: row.templateId ?? null` do mapowanej odpowiedzi.

### Rozszerzenie `pageTypes`
```ts
const pageTypes = [
  { key: "page", name: "Page", helpText: "", icon: "", hasSlug: true },
  { key: "blog_post", name: "Blog Post", helpText: "", icon: "", hasSlug: true },
  { key: "blog_post_template", name: "Blog Template", helpText: "", icon: "", hasSlug: true },
  { key: "course_entry", name: "Course Entry", helpText: "", icon: "", hasSlug: true },
  { key: "course_template", name: "Course Template", helpText: "", icon: "", hasSlug: true },
];
```

## 4. Definition of Done

- [x] Migracja dodaje `page.templateId` + `page.templateConfig jsonb`. *(odchyłka: bez FK — patrz niżej)*
- [x] `src/lib/cms-collections.ts` z kolekcjami `blog` i `courses` (konfiguracja w kodzie).
- [x] `GET_COLLECTIONS` — zwraca kolekcje z `postCount` i `templates`.
- [x] `LIST_COLLECTION_ITEMS` — search, `draftsOnly`, `templateName`, sort po `createdAt DESC`.
- [x] `CREATE_COLLECTION_ITEM` — walidacja kolekcji/szablonu, unikalny slug, `status: "draft"`.
- [x] `GET_TEMPLATE_DATA` / `UPDATE_TEMPLATE` — zwraca/zapisuje bloki + config szablonu.
- [x] `toChaiPage()` zwraca `templateId`.
- [x] `pageTypes` rozszerzone o typy szablonów.

## 5. Testy

### Unit (Vitest)
- [x] `CMS_COLLECTIONS` — każda kolekcja ma spójne `pageType`/`templatePageType`, szablony należą do kolekcji. — `src/lib/cms-collections.test.ts` (11 testów)
- [x] `LIST_COLLECTION_ITEMS` — filtr `search`, `draftsOnly`, wykluczenie `archived` (manualnie — DB-touching).
- [x] `CREATE_COLLECTION_ITEM` — odrzuca nieistniejący `templateId` / szablon z innej kolekcji; kolizja sluga daje sufiks (manualnie — DB-touching).

### Manualne QA
- [x] `GET_WEBSITE_DATA` nadal zwraca działające `websitePages` + `collections` z wpisami.
- [x] Tworzenie wpisu kolekcji widoczne w `GET_WEBSITE_PAGES` z `pageType: "blog_post"` i `templateId`.

## 5a. Postęp i odchyłki (2026-08-02)

Zaimplementowano zgodnie ze specyfikacją powyżej z dwiema odchyłkami:

1. **`page.templateId` bez FK do `page(id)`.** Spec zakładał `REFERENCES page(id) ON DELETE SET NULL`, ale `templateId` przechowuje **klucz szablonu** (np. `"tpl-blog-classic"`), nie `page.id`. Klucze są współdzielone między tenantami, a strony-szablony (pageType `*_template`) powstają **leniwie, per organizacja** — dopiero `UPDATE_TEMPLATE` (F4) je tworzy. Globalny FK zablokowałby `CREATE_COLLECTION_ITEM` przed istnieniem jakiejkolwiek strony-szablonu. Spójność wymuszana na warstwie API (walidacja przeciw `CMS_COLLECTIONS` w transakcji tenanta). Migracja `0076_blog_templates.sql` dodaje zwykły indeks `page_template_id_idx`.
2. **Szablon-strona identyfikowany przez `(organizationId, pageType = *_template, slug = klucz szablonu)`** — nie przez `page.id`. `GET_TEMPLATE_DATA` szuka po tych trzech polach; gdy brak, zwraca `page: null` + domyślny config (`getDefaultTemplateConfig()`). `UPDATE_TEMPLATE` tworzy stronę lazily (upsert).

Dodatkowo:
- `GET_COLLECTIONS` i `GET_WEBSITE_DATA` dzielą helper `buildCollections()` (jeden `GROUP BY pageType` z `COUNT(*)`).
- `CREATE_COLLECTION_ITEM` używa `resolveUniqueSlug()` (sufiks `-2`, `-3`…), zgodnie ze specem.
- `getCollectionByPageType()`/`getCollectionById()`/`getTemplateById()`/`getTemplateName()` — czyste helpery w `cms-collections.ts`, pokryte testami.

## 6. Pliki

| Plik | Akcja |
|------|-------|
| `src/lib/db/schema/pages.ts` | **Zmiana** — `templateId`, `templateConfig` + indeks |
| `src/lib/db/migrations/0076_blog_templates.sql` | **Nowy** — migracja |
| `src/lib/cms-collections.ts` | **Nowy** — konfiguracja kolekcji + helpery + typy `TemplateConfig` |
| `src/app/(builder)/editor/api/route.ts` | **Zmiana** — akcje API + `toChaiPage` + `pageTypes` + `buildCollections` |
| `src/lib/cms-collections.test.ts` | **Nowy** — testy configu kolekcji |

## 7. Szacowany nakład

3–4h — migracja, config, 5 akcji API, testy.
