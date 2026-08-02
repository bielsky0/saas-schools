# Faza 2.5: Zarządzanie kolekcjami CMS

> Nowa faza między F2 (lewy panel) a F3 (modal listy wpisów). Umożliwia tenantowi tworzenie/edycję/usuwanie własnych kolekcji CMS z poziomu lewego panelu buildera. `CMS_COLLECTIONS` z kodu zostaje całkowicie zastąpione bazą danych — hardcoded config staje się tylko seedem dla migracji.

## Utrwalone decyzje

- **UI w lewym panelu buildera** (fork SDK), nie w dashboardzie/settings.
- **Kolekcje per-tenant** — każda akademia zarządza własnymi kolekcjami.
- **Pełne zastąpienie `CMS_COLLECTIONS`** bazą danych — hardcoded config tylko jako seed dla migracji.
- `api id` kolekcji = stabilny `key` (np. `"blog"`), nie UUID — dla backward compat z istniejącym SDK/API.
- `templates` jako JSONB (wariantów jest mało, 1–5 na kolekcję) — bez osobnej tabeli.

## 1. Database

### Nowa tabela: `cms_collection`

```sql
CREATE TABLE "cms_collection" (
  "id"               text PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"   text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "key"              text NOT NULL,           -- stable slug: "blog", "courses"
  "name"             text NOT NULL,           -- "Wpis na blogu", "Kursy / Nauczyciele"
  "pageType"         text NOT NULL,           -- pageType dla wpisów: "blog_post", "course_entry"
  "templatePageType" text NOT NULL,           -- pageType dla szablonów: "blog_post_template"
  "templates"        jsonb NOT NULL DEFAULT '[]', -- [{ id, name, layout }]
  "position"         int NOT NULL DEFAULT 0,
  "createdAt"        timestamptz NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "key"),
  UNIQUE ("organizationId", "pageType")
);
ALTER TABLE "cms_collection" ENABLE ROW LEVEL SECURITY;
```

**Ograniczenia:**
- `key` unikalny per tenant (stable identifier dla API)
- `pageType` unikalny per tenant (jeden `pageType` = jedna kolekcja)
- `templates` jako JSONB — nie osobna tabela

### Drizzle schema

**Nowy plik:** `src/lib/db/schema/cms-collections.ts` — w stylu `pages.ts`:

```ts
export const cmsCollection = pgTable(
  "cms_collection",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    pageType: text("pageType").notNull(),
    templatePageType: text("templatePageType").notNull(),
    templates: jsonb("templates").$type<CmsTemplate[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    orgKeyIdx: uniqueIndex("cms_collection_org_key_idx").on(t.organizationId, t.key),
    orgPageTypeIdx: uniqueIndex("cms_collection_org_page_type_idx").on(t.organizationId, t.pageType),
  }),
);
```

## 2. Migracja

### Migracja 0077: create table + seed istniejących tenantów

```sql
-- Krok 1: tabela z indeksami i RLS (jak wyżej)
-- Krok 2: seed — kopiuj domyślne kolekcje do każdej istniejącej organizacji
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organization LOOP
    INSERT INTO cms_collection (id, "organizationId", "key", "name", "pageType", "templatePageType", "templates", "position")
    VALUES
      (gen_random_uuid(), org.id, 'blog',  'Wpis na blogu',        'blog_post',            'blog_post_template',  '[{"id":"tpl-blog-classic","name":"Klasyczny Artykuł","collectionId":"blog","layout":"single"},{"id":"tpl-blog-interview","name":"Wywiad / Case Study","collectionId":"blog","layout":"sidebar"}]'::jsonb, 0),
      (gen_random_uuid(), org.id, 'courses', 'Kursy / Nauczyciele', 'course_entry',         'course_template',     '[{"id":"tpl-course-default","name":"Domyślny","collectionId":"courses","layout":"single"}]'::jsonb, 1);
  END LOOP;
END $$;
```

**Nowi tenant:** seed domyślnych kolekcji w `createOrganization()` → warstwa service automatycznie kopiuje domyślny zestaw przy tworzeniu organizacji.

## 3. Backend: `src/app/(builder)/editor/api/route.ts` — zmiany

### 3a. `buildCollections()` — czyta z DB zamiast z `CMS_COLLECTIONS`

```ts
async function buildCollections(tx: TenantDb, organizationId: string) {
  const collections = await tx
    .select()
    .from(cmsCollection)
    .where(eq(cmsCollection.organizationId, organizationId))
    .orderBy(cmsCollection.position);

  const collectionPageTypes = collections.map((c) => c.pageType);
  const counts = /* ... group by pageType, tak jak wcześniej ... */;
  const countByType = Object.fromEntries(counts.map((r) => [r.pageType, r.count]));

  return collections.map((c) => ({
    id: c.key,                        // stable key (nie UUID) dla API clients
    name: c.name,
    pageType: c.pageType,
    templatePageType: c.templatePageType,
    postCount: countByType[c.pageType] ?? 0,
    templates: (c.templates as any[]).map((t: any) => ({ id: t.id, name: t.name, layout: t.layout })),
  }));
}
```

### 3b. Dynamiczne `pageTypes`

```ts
const pageTypes = collectionsData.flatMap((c) => [
  { key: c.pageType, name: c.name, helpText: "", icon: "", hasSlug: true },
  { key: c.templatePageType, name: `${c.name} Template`, helpText: "", icon: "", hasSlug: true },
]);
pageTypes.unshift({ key: "page", name: "Page", helpText: "", icon: "", hasSlug: true });
```

### 3c. Nowe akcje API

| Akcja | Opis | Walidacja |
|-------|------|-----------|
| `CREATE_COLLECTION` | Tworzy kolekcję | key regex `^[a-z0-9_-]+$`, unikalny per tenant |
| `UPDATE_COLLECTION` | Edytuje nazwę, key, templates | key unikalny, pageType nie może kolidować |
| `DELETE_COLLECTION` | Usuwa kolekcję | Blokuje gdy `postCount > 0` (patrz ryzyka) |
| `CREATE_COLLECTION_TEMPLATE` | Dodaje wariant szablonu | Limit templates (max ~10) |
| `UPDATE_COLLECTION_TEMPLATE` | Edytuje wariant | templateId musi istnieć |
| `DELETE_COLLECTION_TEMPLATE` | Usuwa wariant | Min. 1 template per kolekcja |

### 3d. Trigger `updated_at`

```sql
CREATE TRIGGER update_cms_collection_updated_at
  BEFORE UPDATE ON cms_collection
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 4. SDK — zmiany

### 4a. Nowy komponent: `collection-manager.tsx`

**Lokalizacja:** `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/collection-manager.tsx`

Inline panel lub Dialog otwierany z lewego panelu:

```
┌─ Zarządzaj kolekcjami CMS ────────────────┐
│                                             │
│ + Dodaj kolekcję                            │
│                                             │
│ ┌─ Wpis na blogu (blog) ─────────────────┐ │
│ │ pageType: blog_post                     │ │
│ │ Szablony:                               │ │
│ │  ▸ Klasyczny Artykuł (single)           │ │
│ │  ▸ Wywiad / Case Study (sidebar)        │ │
│ │ [Edytuj] [Usuń]                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Zamknij]                                   │
└─────────────────────────────────────────────┘
```

### 4b. Nowy hook: `use-collection-actions.ts`

```ts
export const useCollectionActions = () => {
  // createCollection(data)
  // updateCollection(id, data)
  // deleteCollection(id)
  // addTemplate(collectionId, template)
  // updateTemplate(collectionId, templateId, data)
  // deleteTemplate(collectionId, templateId)
  // każda akcja invaliduje ["cms-collections"]
};
```

### 4c. `pages-tab.tsx` — punkt wejścia

Przy nagłówku sekcji „SZABLONY (KOLEKCJE CMS)" dodać przycisk ⚙️ (Settings) lub `+` otwierający `collection-manager`.

### 4d. `collection-tree-group.tsx` — contextual actions

Dodać ikonę `...` przy nazwie kolekcji → drop-down: Edytuj / Usuń kolekcję.

### 4e. i18n

Nowe klucze (en.json + pl.json):

- `"Manage collections"` / `"Zarządzaj kolekcjami"`
- `"Add collection"` / `"Dodaj kolekcję"`
- `"Collection name"` / `"Nazwa kolekcji"`
- `"Collection key"` / `"Klucz kolekcji"`
- `"Page type"` / `"Typ strony"`
- `"Templates"` / `"Szablony"` (istnieje)
- `"Add template"` / `"Dodaj szablon"`
- `"Delete collection"` / `"Usuń kolekcję"`
- `"Cannot delete collection with existing posts"` / ...

## 5. Usunięcie `cms-collections.ts`

Po migracji:

1. Usunąć `src/lib/cms-collections.ts`
2. Usunąć `src/lib/cms-collections.test.ts`
3. Typy `CmsCollection`, `CmsTemplate`, `CmsTemplateLayout` przenieść do `src/lib/db/schema/cms-collections.ts`
4. Wszystkie istniejące referencje do `CMS_COLLECTIONS`, `getCollectionById()` itp. zastąpić query do DB
5. Helpery `getCollectionByPageType`, `getTemplateById`, `getTemplateName`, `getDefaultTemplateConfig` implementować jako queries/helpers nad DB

## 6. Pliki — podsumowanie

| # | Plik | Akcja | Wysiłek |
|---|------|-------|---------|
| **Database** ||||
| 1 | `src/lib/db/schema/cms-collections.ts` | NOWY — Drizzle schema | 20min |
| 2 | `src/lib/db/migrations/0077_cms_collections.sql` | NOWY — create table + seed | 30min |
| 3 | `src/lib/db/schema/index.ts` | Re-export cmsCollection | 5min |
| **Backend** ||||
| 4 | `src/app/(builder)/editor/api/route.ts` | buildCollections z DB, dynamiczne pageTypes, 6 nowych akcji CRUD, usunięcie importów z cms-collections | 120min |
| 5 | `src/lib/cms-collections.ts` | USUŃ (typy do schema) | 10min |
| 6 | `src/lib/cms-collections.test.ts` | USUŃ (testy DB-touching) | 5min |
| 7 | `src/lib/block-data.ts` | Zamień hardcoded `"blog_post"` na query collection pageType | 15min |
| 8 | `src/lib/page-service.ts` | Zamień hardcoded wykluczenie `"blog_post"` | 10min |
| 9 | Nowy seed przy tworzeniu org | `createOrganization()` seeduje domyślne kolekcje | 20min |
| **SDK** ||||
| 10 | `use-collection-actions.ts` | NOWY — hook CRUD z invalidacją query | 30min |
| 11 | `collection-manager.tsx` | NOWY — panel zarządzania kolekcjami | 90min |
| 12 | `pages-tab.tsx` | Przycisk „Zarządzaj kolekcjami" | 20min |
| 13 | `collection-tree-group.tsx` | Drop-down actions per kolekcja | 20min |
| 14 | `en.json` + `pl.json` | Nowe klucze i18n | 15min |
| 15 | `i18n.test.ts` | Dodanie kluczy do listy | 10min |
| **Testy** ||||
| 16 | Nowe testy Vitest | Testy helperów DB, walidacji API | 30min |
| | **Razem** | | **~7–8h** |

## 7. Ryzyka

1. **Orphan pages po usunięciu kolekcji.** Jeśli tenant ma 50 wpisów w kolekcji i ją usunie, `pageType` na stronach staje się niezarządzany (wypada z drzewa kolekcji, nie wraca do STRONY). Rozwiązanie: API blokuje `DELETE_COLLECTION` gdy `postCount > 0` — tenant musi najpierw usunąć/zmienić wpisy.

2. **Backward compat API.** API zwracało `id: "blog"` (key) — zachowujemy to. Zmiana `id` na UUID zepsułaby SDK (hook `useCollections`, `onOpenPosts(collectionId)`).

3. **`pageType` kolizja.** Jeśli tenant stworzy kolekcję z `pageType: "blog_post"`, a ta już istnieje, UNIQUE constraint odrzuci. API musi zwrócić czytelny błąd.

4. **`key` zmiana.** Jeśli tenant zmieni `key` z `"blog"` na `"aktualnosci"`, API `GET_COLLECTIONS` zwróci nowe ID. SDK w runtime przeładuje dane — query invalidation załatwi.

5. **Template pages** (`pageType = templatePageType`) — przy usunięciu kolekcji strony-szablony zostają osierocone. Można je usunąć kaskadowo lub oznaczyć jako archived.

## 8. Zależności od istniejących faz

- ✅ Nie zależy od F3 (modal) — jest niezależną ścieżką
- ✅ Zależy od F2 (lewy panel) — rozszerza istniejące komponenty
- ✅ F3–F6 działają bez zmian — konsumują API które zwraca ten sam format

## 9. Kolejność implementacji

| Krok | Co | Dlaczego najpierw |
|------|-----|-------------------|
| 1 | DB: schema + migracja + seed | Fundament — bez tego nic nie działa |
| 2 | Backend: buildCollections z DB + pageTypes dynamiczne | API musi działać ze starym SDK (backward compat) |
| 3 | Backend: akcje CRUD | Nowe endpointy |
| 4 | Usunięcie cms-collections.ts + cleanup referencji | Porządki po starym kodzie |
| 5 | Seed przy tworzeniu org | Nowi tenant dostają domyślne kolekcje |
| 6 | SDK: hook + komponent collection-manager | UI |
| 7 | SDK: integracja z pages-tab + collection-tree-group | Punkt wejścia |
| 8 | i18n + testy | Na koniec |
