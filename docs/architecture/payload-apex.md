# Payload CMS — tylko apex.pl

Payload CMS służy wyłącznie do zarządzania platformą na poziomie **apex.pl** (domena główna). **Nie** jest już website builderem dla tenantów — tę rolę przejął ChaiBuilder (`docs/architecture/chaibuilder-cms.md`).

## Zakres odpowiedzialności

- **Konfiguracja per-tenant** — ustawienia organizacji, plany, feature flags
- **Content writing** — treści administracyjne, mailingi, konfiguracja bloków dostępnych dla tenantów
- **Super Admin panel** — dostępny tylko dla administratorów platformy (`requireSuperAdmin()`)

## Routing

| Ścieżka | Cel |
|---|---|
| `langlion.pl/{locale}/admin` | Panel Super Admina Payload |
| `/api/payload` | API Payload (tylko wewnętrzne, na apeksie) |

## Konfiguracja

**Plik:** `src/features/cms/payload-config.ts`

- **Database:** współdzielona instancja PostgreSQL z główną aplikacją
- **Auth:** Custom auth strategy (`betterAuthPayloadStrategy`) — Payload używa sesji Better Auth
- **Admin:** Branded jako "Langlion CMS", język polski
- **Kolekcje:** `pages`, `media`, `theme`, `users` (jako `payload_admin_users`)
- **Storage:** Custom `StorageAdapter` nad adapterem S3 boilerplate'u
- **GraphQL:** wyłączone

## Izolacja

Tabele Payloada nie podlegają RLS — są dostępne tylko z poziomu apeksu przez super adminów. `organization_id` na tabelach CMS służy do filtrowania danych w panelu Super Admina (widok per-tenant), nie jako izolacja security.

## Kolekcje

### pages
Strony zarządzane z poziomu super admina — np. landing page, strona z cennikiem, regulamin.

### media
Pliki i zasoby statyczne platformy.

### theme
Konfiguracja motywu per-organization (zarządzana przez super admina).

### users (payload_admin_users)
Kolekcja techniczna — rekordy tworzone automatycznie przy pierwszym logowaniu przez auth strategy (upsert po email z Better Auth). Niezarządzana ręcznie.

## Auth strategy

`betterAuthPayloadStrategy` w `src/features/cms/payload-auth-strategy.ts`:
- Waliduje sesję Better Auth
- Rozpoznaje `organizationId` z `x-org-subdomain` header (ustawiany przez `src/proxy.ts`)
- Tworzy rekord w `payload_admin_users` przy pierwszym logowaniu
