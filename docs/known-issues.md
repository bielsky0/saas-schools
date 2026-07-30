# Known Issues & Technical Risks

Nierozwiązane błędy i ryzyka techniczne — stan na 2026-07-30.

## Aktywne problemy

### Live Preview auto-refresh — niepotwierdzone działanie

**Plik:** `src/features/cms/components/refresh-route-on-save.client.tsx`

`postMessage` (`payload-document-event`) dociera z panelu admina do iframe'a, `router.refresh()` wywołuje się poprawnie, ale widoczna treść w iframie nie zawsze się odświeża. Testy w dev-mode dały niespójne wyniki (czasem działa, czasem nie).

**Podejrzenie:** Turbopack Fast Refresh/HMR resetuje subskrypcję `postMessage` w `RefreshRouteOnSave` w nieprzewidywalny sposób.

**Bloker weryfikacji produkcyjnej:** Lokalnie `pnpm build && pnpm start` przełącza URL na `https`, ale nie ma SSL na porcie 3000 — iframe blokowany przez CSP `frame-src 'self'`.

**Next steps:** Test na stagingu z SSL; test z `TURBOPACK_FAST_REFRESH=0` w dev.

### RLS + connection pooling

`SET LOCAL` nie przyjmuje placeholdera. Rozwiązane przez `set_config('app.organization_id', …, true)` — trzeci argument `true` = zasięg transakcji. `false` dałoby zasięg sesji i wyciek kontekstu przez pulę połączeń. Pokryte testem.

### `ON CONFLICT` pod RLS

`DO NOTHING` to cichy no-op (sprawdza tylko `WITH CHECK` INSERT-a). `DO UPDATE` na niewidoczny wiersz rzuca `42501`. Istotne przy każdym upsercie (webhooki, kredyty, zwroty).

### `FORCE ROW LEVEL SECURITY` + backfille

Przy `FORCE` migracja podlega politykom — jeśli rola migracyjna straci BYPASSRLS, `UPDATE` w backfillu trafi zero wierszy i **nie zgłosi błędu**. Migracja przejdzie, dane nie zostaną zaktualizowane.

### `db:migrate` nie zautomatyzowany przy deployu

Migracja produkcyjna to **osobna, ręczna operacja poza deployem**. Dla migracji RLS kolejność jest krytyczna: migracja przed kodem = pełna awaria; kod przed migracją = brak zmiany. Gwarantowane wyłącznie dyscypliną operatora.

### `NEXT_PUBLIC_APP_URL` build-time inline

Jeden obraz nie może być kanoniczny dla wielu hostów. Dotyczy linków weryfikacyjnych, zaproszeń i canonical/sitemap per tenant. Wymaga request-aware wariantu `absoluteUrl()`.

### `drizzle-kit push` niszczy RLS

EXCLUDE, polityki RLS i GRANT-y żyją wyłącznie w ręcznym SQL, niewidoczne dla snapshotu Drizzle. `push` introspektuje żywą bazę i proponuje DROP polityk. Skryptu `db:push` nie ma i nie wolno go dodać.

### Kolizje nazw eksportów w `schema/index.ts`

`export *` z dwóch modułów eksportujących tę samą nazwę — nazwa zostaje cicho pominięta, a drizzle-kit generuje FK wskazujący na inną tabelę. Zdarzyło się raz (`session` ↔ Better Auth). Przed dodaniem tabeli: grep po katalogu schematu.

### Migracja może zostać cicho pominięta

Drizzle stosuje migracje, których `when` w `meta/_journal.json` jest **większe** niż ostatnio zastosowane. Migracje ręczne mają `when` wpisane z palca — przy nieodpowiednim stemplu migracja zostaje pominięta, a `db:migrate` zgłasza sukces. Reguła: po każdym `db:generate` sprawdzić monotoniczność `when`.

### Redirect z Server Action omija proxy

`redirect()` w Server Action jest rozwiązywany wewnętrznie przez Next — cel renderuje się bez nowego żądania, więc `src/proxy.ts` go nie widzi. Rozwiązane strukturalnie w F5 (wielokrokowy zapis pod jedną trasą). Pozostałość: pierwszy render po `loginToAcademy` nie rozstrzyga tenanta.

### Payload `locked_documents` — bez RLS

`payload_locked_documents` i `payload_locked_documents_rels` nie mają `organization_id`. RLS przez subquery jest technicznie możliwy, ale kruchy. Ryzyko niskie: dane efemeryczne, tylko metadata, Payload odrzuca cross-tenant dostęp na poziomie aplikacji.

### framer-motion vs motion — konflikt wersji

SDK ChaiBuilder ma `framer-motion@12.23.20` obok `motion@^12.24.1`. Rozwiązane przez `pnpm.overrides` w root `package.json`. Overrides muszą zostać na stałe. Do rozważenia: podbicie `framer-motion` w forku SDK.

## Zależności od środowiska

### E2E zależy od publicznego DNS

Suita adresuje hosty tenantów przez `*.localtest.me`, które rozwiązuje się przez publiczny DNS na 127.0.0.1. Runner bez egressu DNS wisi do timeoutu. CI ma krok `getent hosts probe.localtest.me` przed Playwrightem.

### Testy zależne od kolejki niestabilne przy `fullyParallel`

Na świeżej bazie i równoległym starcie specy kolejkowe (maile, generowanie sezonu) bywają czerwone. CI używa `--workers=1` — bramka merge'a jest wiarygodna. Lokalnie przed uznaniem porażki za regresję: powtórzyć na `--workers=1`.

### Vercel Hobby = cron dzienny

Mechanizmy czasowe wymagają w produkcji zewnętrznego pingera `/api/cron/jobs` albo planu Pro.
