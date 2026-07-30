# Moduł CMS / Website Builder

**Stan:** Wszystkie fazy implementacji zakończone. Pełna specyfikacja i plany w `docs/archive/`.

## Architektura docelowa

### ChaiBuilder — główny website builder

ChaiBuilder SDK (fork w `packages/chaibuilder-sdk/`) jest silnikiem wizualnego buildera stron dla tenantów. Każda akademia buduje własną witrynę przez edytor drag-and-drop.

- **Edytor:** `{subdomain}/editor` — `ChaiWebsiteBuilder` z `@chaibuilder/sdk`
- **Publiczny renderer:** `src/app/(public)/cms-page/[[...slug]]/page.tsx`
- **Bloki:** custom bloki rejestrowane w `src/blocks/index.ts`

**Szczegóły:** `docs/architecture/chaibuilder-cms.md`

### Payload CMS — tylko apex.pl

Payload służy wyłącznie do zarządzania platformą na poziomie domeny głównej (apex.pl). Nie jest już website builderem — tę rolę przejął ChaiBuilder.

- **Admin panel:** `langlion.pl/{locale}/admin` — dostępny tylko dla super adminów
- **Zakres:** konfiguracja per-tenant, content writing, zarządzanie blokami

**Szczegóły:** `docs/architecture/payload-apex.md`

## Model danych (stan obecny)

Tabele CMS współdzielą instancję PostgreSQL z główną aplikacją:

- `pages` — strony (ChaiBuilder blocks jako JSONB)
- `media` — pliki i zasoby
- `theme` — motyw per-organization (fonty, kolory) — 1:1
- `tenant_block_access` — rejestr bloków dostępnych per akademia

Wszystkie tabele niosą `organization_id` i podlegają RLS (druga linia obrony).

## Historia

Pełna specyfikacja (wersja 2, 2026-07-22), plany implementacji (fazy 30-32) i raport spike znajdują się w `docs/archive/`:
- `docs/archive/specyfikacja-cms.md` (oryginalna specyfikacja)
- `docs/archive/plan/faza-30-32.md` (plan implementacji)
- `docs/archive/spike-30/` (raport weryfikacji architektury)
