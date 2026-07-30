<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## CMS / Website Builder — podział odpowiedzialności

### ChaiBuilder — główny website builder

ChaiBuilder SDK (fork w `packages/chaibuilder-sdk/`) jest głównym silnikiem CMS dla tenantów. Każda akademia buduje własną witrynę przez edytor drag-and-drop pod `{subdomain}/editor`.

- **Edytor wizualny:** `src/app/(builder)/editor/editor.tsx` — `ChaiWebsiteBuilder` z `@chaibuilder/sdk`
- **Publiczny renderer:** `src/app/(public)/cms-page/[[...slug]]/page.tsx` — `RenderChaiBlocks`
- **Bloki custom:** rejestrowane w `src/blocks/index.ts` przez `registerChaiBlock()`
- **Styling:** Tailwind CSS v4 + `getChaiBuilderTailwindConfig()` + `getChaiThemeCssVariables()`
- **Theme:** encja per-organization (fonty, kolory), wstrzykiwana przez `ThemeInjector`

Szczegóły: `docs/architecture/chaibuilder-cms.md`

### Payload CMS — tylko apex.pl

Payload służy wyłącznie do zarządzania platformą na poziomie **apex.pl** (domena główna). **Nie** jest już website builderem.

- **Admin panel:** `langlion.pl/{locale}/admin` — dostępny tylko dla super adminów (`requireSuperAdmin()`)
- **API:** `/api/payload` — wewnętrzne, na apeksie
- **Konfiguracja:** `src/features/cms/payload-config.ts`
- **Auth:** Custom strategy (`betterAuthPayloadStrategy`) — Payload używa sesji Better Auth

Szczegóły: `docs/architecture/payload-apex.md`

## ChaiBuilder SDK — fork jako pnpm workspace package

Fork `@chaibuilder/sdk` żyje w `packages/chaibuilder-sdk/` wewnątrz tego repo
(wprowadzony przez `git subtree` z https://github.com/bielsky0/sdk, gałąź saas-school-patches).
Jeden `git clone` + `pnpm install` wystarcza — nie wymaga osobnego repo obok.

Synchronizacja z oryginałem (upstream): `git subtree pull --prefix=packages/chaibuilder-sdk sdk-fork dev --squash`

Powód forka: audyt bezpieczeństwa wykrył IDOR-y i race condition (static appId)
niekompatybilne z architekturą multi-tenant.

### Znany konflikt wersji: framer-motion vs motion

SDK ma `framer-motion@12.23.20` (pin) obok `motion@^12.24.1` (który narzuca `framer-motion@^12.24.1`).
Bez `pnpm.overrides` w root `package.json`, pnpm deduplikuje do niekompatybilnej wersji `motion-dom`
(usuniętych ~80 eksportów), crashując edytor ChaiBuilder w runtime.

**Overrides muszą zostać na stałe** — nie usuwać przy porządkowaniu zależności.
Do rozważenia w przyszłości: podbicie `framer-motion` w forku SDK do zgodności z `motion`,
żeby overrides przestały być potrzebne (wymaga testów regresji animacji).

## shadcn/ui i Tailwind w CMS admin

- **Component registry:** `@/ui` → `src/features/cms/admin/components/ui/` (per `components.json`)
- **Shared UI primitives** also exist at `src/components/ui/` (used outside CMS admin)
- **Tailwind v4** entry: `src/features/cms/admin/styles/tailwind.css` — uses `@import "tailwindcss" layer(utilities)` (skips Preflight) and `@import "tw-animate-css"` for Radix animations
- **`cn()`** at `@/lib/utils` (uses `clsx` + `tailwind-merge`)

## Known Issues

Nierozwiązane błędy i ryzyka techniczne są udokumentowane w `docs/known-issues.md`. Przed rozpoczęciem pracy nad kodem w obszarze objętym znanym ryzykiem, przeczytaj odpowiednią sekcję.
