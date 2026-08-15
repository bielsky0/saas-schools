# SDK Test Baseline — Modułowy Kreator Stron

> **Data baselineu:** 2026-08-15 (przed startem Fazy 1)
> **Cel:** wykrywanie regresji w `packages/chaibuilder-sdk/` podczas implementacji planu (`docs/modular-builder-implementation-plan.md`).

## Wynik wyjściowy

| Metryka | Wartość |
|---|---|
| Test Files | **62 passed** (62) |
| Tests | **603 passed | 1 skipped** (604) |
| Komenda | `pnpm --filter @chaibuilder/sdk test` |
| Pełny log | `docs/dev/logs/sdk-tests-baseline-2026-08-15.log` |
| Czas | ~10 s |

## Faza 1 — po implementacji (2026-08-15)

| Metryka | Wartość |
|---|---|
| Test Files | **66 passed** (66) |
| Tests | **625 passed | 1 skipped** (626) |
| Nowe testy | 22 (`tokens` 7, `section-catalog` 9, `section-groups.catalog` 2, `section-preview` 4) |
| Pełny log | `docs/dev/logs/sdk-tests-phase1-2026-08-15.log` |

Nowe pliki testów (Faza 1):
- `src/pages/client/layouts/tokens/shopify-tokens.test.ts` (7) — spójność tokenów CSS ↔ TS (§2.1)
- `src/pages/client/layouts/left-panel/section-catalog.test.ts` (9) — rejestr/katalog sekcji (§2.2)
- `src/pages/client/layouts/left-panel/section-groups.catalog.test.ts` (2) — role z katalogu w grupowaniu (§2.2)
- `src/pages/client/layouts/left-panel/section-preview.test.tsx` (4) — hover-preview + fallback (§2.3)

## Jak porównywać przy regresjach

```bash
pnpm --filter @chaibuilder/sdk test 2>&1 | tee docs/dev/logs/sdk-tests-check.log
diff <(grep -E "✓|✗|passed|failed" docs/dev/logs/sdk-tests-phase1-2026-08-15.log) \
     <(grep -E "✓|✗|passed|failed" docs/dev/logs/sdk-tests-check.log)
```

Kryterium "brak regresji" (stan po Fazie 1):
- liczba test files: **66**,
- liczba passed: **625** (skipped: 1 — test z `it.skip`),
- **żadna** linia `✗` / `failed`.

## Pliki testów objęte baselinem (66)

Pełna lista w logu: `docs/dev/logs/sdk-tests-phase1-2026-08-15.log`. Kluczowe pliki dotykane przez Fazy 1–4:

- `src/pages/client/layouts/left-panel/section-groups.test.ts` (7) — katalog sekcji (Faza 1, §2.2)
- `src/pages/client/layouts/left-panel/section-catalog.test.ts` (9) — nowy (Faza 1, §2.2)
- `src/pages/client/layouts/left-panel/section-groups.catalog.test.ts` (2) — nowy (Faza 1, §2.2)
- `src/pages/client/layouts/tokens/shopify-tokens.test.ts` (7) — nowy (Faza 1, §2.1)
- `src/pages/client/layouts/left-panel/section-preview.test.tsx` (4) — nowy (Faza 1, §2.3)
- `src/pages/client/layouts/left-panel/page-groups.test.ts` (10)
- `src/hooks/theme-contrast.test.ts` (2) — kontrast tokenów (Faza 4, §5.1)
- `src/pages/client/layouts/mobile/use-is-mobile.test.ts` (2)
- `src/core/components/sidepanels/panels/outline/getBlockDisplayName.test.ts` (7) — węzeł drzewa (Faza 2)

## Uwagi

- Testy SDK są niezależne od bazy danych (jsdom) — można odpalać bez docker/db.
- `pnpm test` (root) to testy aplikacji (osobne, nie wchodzą w ten baseline).
- `pnpm test:e2e` (Playwright) wymaga pełnego builda + bazy — poza tym baselinem.
- `pnpm typecheck` (root) ma 7 **pre-existing** błędów (e2e spec, `editor/tailwind.config.ts` duplicate import, `admin-preview.test.ts`) niezwiązanych z Fazą 1.
