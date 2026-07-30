# Architektura i konwencje kodu

**To jest spis treści.** Pełna treść dokumentu została podzielona na osobne pliki tematyczne w `docs/architecture/`. Zanim zaczniesz czytać którykolwiek z plików poniżej, zapytaj graf graphify o konkretną sekcję/temat.

## Spis sekcji

| Sekcja | Plik |
|---|---|
| Stack, Directory layout, Core principles | [docs/architecture/00-overview.md](architecture/00-overview.md) |
| ChaiBuilder — Website Builder (główny CMS dla tenantów) | [docs/architecture/chaibuilder-cms.md](architecture/chaibuilder-cms.md) |
| Payload CMS tylko dla apex.pl (Super Admin, konfiguracja) | [docs/architecture/payload-apex.md](architecture/payload-apex.md) |
| Reference patterns (adaptery, i18n, zadania, dane, audyt, UI, walidacja, płatności, bezpieczeństwo) | [docs/architecture/reference-patterns.md](architecture/reference-patterns.md) |
| Rate limiting in production, Common commands, Local setup, Two database URLs (RLS) | [docs/architecture/operations-and-local-setup.md](architecture/operations-and-local-setup.md) |
| Row-Level Security — deep dive, incl. deploying migrations, `ON CONFLICT`, adding a table | [docs/architecture/rls.md](architecture/rls.md) |
| Two session mechanisms (staff/parents), Host resolution and tenant header, Canonical URLs | [docs/architecture/sessions-and-routing.md](architecture/sessions-and-routing.md) |
| Background jobs in production, Billing webhooks locally | [docs/architecture/jobs-and-webhooks.md](architecture/jobs-and-webhooks.md) |

## Pozostałe dokumenty

| Dokument | Opis |
|---|---|
| [docs/known-issues.md](known-issues.md) | Nierozwiązane błędy i ryzyka techniczne |
| [docs/specyfikacja-cms.md](specyfikacja-cms.md) | Specyfikacja CMS (historyczna — ChaiBuilder + Payload) |
| [docs/boilerplate-spec.md](boilerplate-spec.md) | Specyfikacja fundamentu boilerplate'owego (spis treści) |

## Archiwum

Stare plany implementacji i specyfikacje funkcjonalne (wszystkie fazy zakończone) znajdują się w `docs/archive/`.
