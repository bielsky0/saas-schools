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

## shadcn/ui in PagesEditView (CMS admin)

- **Component registry:** `@/ui` → `src/features/cms/admin/components/ui/` (per `components.json`)
- **Shared UI primitives** also exist at `src/components/ui/` (used outside CMS admin)
- **`useField`** from Payload is exported from the main barrel `@payloadcms/ui` — do NOT use the subpath `@payloadcms/ui/forms/useField` (it breaks React Context sharing for `ConfigProvider`). **Additionally, `useField` is not safe to call outside of Payload's native `RenderFields`/`TextField` tree** — doing so triggers `nonIterableSpread` in `useThrottledEffect` (`@babel/runtime`) because the React Compiler cache (`_c`) can produce a non-iterable deps array when `useField` is called directly in custom document views. Use `useForm().dispatchFields` + `setModified` as a fallback instead. **IMPORTANT:** `useForm()` must be called from a component **inside** `<Form>` (the context is only available below `<Form>` in the tree).
- **Tailwind v4** entry: `src/features/cms/admin/styles/tailwind.css` — uses `@import "tailwindcss" layer(utilities)` (skips Preflight) and `@import "tw-animate-css"` for Radix animations
- **Theme variables** mapped to Payload's `--theme-elevation-*` via `@theme inline` in tailwind.css
- **PagesEditView** lives at `src/features/cms/admin/views/pages-edit-view.client.tsx` with `BlocksField` at `src/features/cms/components/blocks-field.client.tsx`
- **DnD fixed** — SSR hydration mismatch (`aria-describedby` counter) resolved by passing an explicit `id` prop to `<DndContext>`. Each instance uses `dnd-${path}` to avoid ID collision across nested BlocksField instances.

## Live Preview auto-refresh (open issue)

**Stan:** Faza 2 zakończona, ale auto-refresh Live Preview (reakcja na zmiany w adminie bez ręcznego odświeżania) ma niepotwierdzony status w dev.

**Co jest pewne (zweryfikowane):**
- `postMessage` (`payload-document-event`) dociera z panelu admina do iframe'a
- `router.refresh()` w `RefreshRouteOnSave` (`src/features/cms/components/refresh-route-on-save.client.tsx`) wywołuje się poprawnie
- `getPage` z `draft: true` (wywoływana przez `CmsPage` w `[...cmsSlug]/page.tsx`, nie przez `generateMetadata`) zwraca świeże dane z bazy

**Co jest niepewne:**
- Czy widoczna treść w iframie faktycznie się odświeża — testy w dev-mode dały niespójne wyniki (czasem logi się pojawiały, czasem nie, mimo identycznej procedury)
- Podejrzenie: Turbopack Fast Refresh/HMR resetuje subskrypcję `postMessage` w `RefreshRouteOnSave` w nieprzewidywalny sposób

**Co blokowało weryfikację produkcyjną:**
`pnpm build && pnpm start` lokalnie nie jest miarodajne — logika budowania URL (`NODE_ENV === "production" ? "https" : "http"`) przełącza na `https` w produkcji, ale lokalnie nie ma SSL na porcie 3000. Iframe (`https://vivamoda.localtest.me:3000/...`) jest blokowany przez CSP `frame-src 'self'` (inny origin niż http). To nie błąd kodu — ograniczenie testowania production mode lokalnie bez certyfikatu.

**Do zrobienia w przyszłej sesji:**
- Test na stagingu z SSL
- Test z wyłączonym Fast Refresh w dev (np. `TURBOPACK_FAST_REFRESH=0`) aby wykluczyć/potwierdzić hipotezę HMR
