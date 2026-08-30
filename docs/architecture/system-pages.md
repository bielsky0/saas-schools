# System pages (mvp-plan F1)

Strony systemowe to platform-owned strony, które każda akademia dostaje seeded na start
i może edytować w edytorze ChaiBuilder. Obecnie jest to wyłącznie **`system_404`**.

> ⚠️ **Strony zapisów NIE są systemowe.** `enrollment_detail` / `enrollment_listing`
> działają w modelu CMS kolekcji + szablonów w stylu Shopify (F2) — dokładnie jak blog:
> produkt = GroupType, layout = `enrollment_template`, listing = `enrollment_listing`
> (normalna strona, analog `blog_index`). Wybór szablonu odbywa się w dashboardzie,
> w edycji grupy zapisów (wzorzec `post-editor.tsx` w blogu).

## Rejestr — jedyne źródło prawdy

Wszystko wynika z `src/lib/system-pages.ts` (`SYSTEM_PAGE_DEFINITIONS`). Każdy wpis opisuje:

| Pole | Znaczenie |
|------|-----------|
| `type` | wartość `pageType` w tabeli `page` (np. `"system_404"`) |
| `label` | etykieta w edytorze (`GET_PAGE_TYPES` → `name`) |
| `slug` | domyślny slug seedu; `null` → typ zarejestrowany, ale nie seedowany |
| `seed` | czy tworzyć stronę dla nowych orgów |
| `deletable` | czy `DELETE_PAGE` jest dozwolony |
| `status` | status seedu (`published` / `draft`) |
| `isHome` | czy seedowany jako strona główna |
| `buildDefaultBlocks` | **fabryka** bloków (świeże `_id` per org — bez kolizji) |

Co z rejestru wynika automatycznie:

- **Seed:** `defaultSystemPages(orgId, createdByUserId)` w `createOrganizationAction`
  (seeduje też stronę główną przez `defaultHomePage` — zwykła strona `page`, nie systemowa).
- **Lista typów edytora:** `buildPageTypes` w `src/app/(builder)/editor/api/route.ts`
  emituje każdy typ z `isSystem: true` → SDK grupuje je pod „System pages"
  (lewy panel: `page-groups.ts`, topbar: sekcja w `page-selector-in-header.tsx`).
- **Ochrona:** `DELETE_PAGE`, `DUPLICATE_PAGE`, `UPDATE_PAGE` (zmiana pageType),
  `MARK_AS_TEMPLATE` zwracają 403 dla stron systemowych (wg `deletable`).
- **Renderer 404:** `src/app/[locale]/not-found.tsx` czyta `system_404` przez
  `getPageByType` i renderuje przez `CmsPageView` (motyw tenanta). Fallback:
  apex / brak org / brak published → domyślny statyczny 404 (D57 — nigdy marketing).

## Jak dodać nową stronę systemową

1. Dodaj jeden wpis do `SYSTEM_PAGE_DEFINITIONS` (typ, label, slug, seed, status, fabryka bloków).
2. Jeśli ma być seedowana — ustaw `seed: true` i `slug`.
3. Wszystko inne (seed, edytor, grupy, guardy) działa samo.

Przykład — dodanie strony `system_403`:
```ts
{ type: "system_403", label: "403 — Brak dostępu", slug: "403", seed: true, status: "published", buildDefaultBlocks: buildForbiddenBlocks }
```

## Dlaczego fabryka bloków?

`buildDefaultBlocks` jest funkcją wywoływaną **per org**, nie stałą. Współdzielone stałe
bloków = te same `_id` w wielu tenantach, co psuje store bloków edytora. Wzorzec istnieje
już w `src/lib/blocks-library.ts` (`nanoid()` per blok).

## Renderowanie publiczne

Strony systemowe renderują się przez wspólny komponent `src/features/cms/cms-page-view.tsx`
(`ThemeInjector` + `PageStyles` + `TenantPageRenderer`) — ten sam, którego używają
home (`[locale]/page.tsx`) i CMS catch-all (`[locale]/(cms)/[...cmsSlug]`).

- `system_404` → `not-found.tsx` (nieznane trasy na hostach tenantów).