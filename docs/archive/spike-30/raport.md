# Raport: Faza 30-spike — Weryfikacja Payload CMS + izolacja tenantowa

**Data:** 2026-07-26
**Baza:** Lokalny Postgres (Docker, port 5433)
**Sterownik aplikacji:** postgres.js (`postgres` v3.4.7, `drizzle-orm` v0.45.2)
**Sterownik Payloada:** node-postgres (`pg` v8.22.0) przez `@payloadcms/db-postgres` v3.86.0
**Payload:** v3.86.0
**Branch:** `spike/30-payload`

---

## Podsumowanie

Spike potwierdza **WARIANT 1 jako osiągalny** z kluczowym zastrzeżeniem:

**Operacje zapisu (create/update/delete) są wrapowane w transakcję (`req.transactionID = PRESENT`).**
**Operacje odczytu (find/findByID) NIE są wrapowane w transakcję (`req.transactionID = ABSENT`).**
**`findByID()` — A0c-ext: VERIFIED ABSENT** (potwierdzone przez beforeOperation hook capture).

Konsekwencja: `set_config('app.organization_id', $id, true)` w `beforeOperation` hooku **działa dla zapisów**, ale **nie działa dla odczytów** (GUC ginie po hooku przed query).

## Faza -1: limit połączeń Supabase

| Test | Wynik | Uwagi |
|------|-------|-------|
| L1 — limit planu | 15 | Symulowany limit Supabase Free (15) |
| L2 — baseline aplikacji | 5 | Idle baseline (postgres.js). W produkcji ~2-5 |
| L3 — aplikacja + Payload | 5 | Payload pool max=3 dodaje do 3 połączeń |
| L4 — zmieściliśmy się w limicie? | ✅ PASS | app max=7 + Payload max=3 = 10 ≤ 15 |

## Faza 0: tożsamość transakcji i połączenia

| Test | Wynik | Uwagi |
|------|-------|-------|
| **A0c** — req.transactionID w beforeOperation | ✅ RÓŻNIE (create/find) / **✅ findByID: VERIFIED** | `create()` → PRESENT, `find()` → ABSENT. `findByID()` → **ABSENT** (A0c-ext, potwierdzone). Admin Panel edycja strony NIE ma RLS za darmo — jedyna ochrona to `access.read`. |
| **A0c-ext (C1+findByID)** — C1 integracja + findByID transactionID | ✅ **C1 PASS** + **✅ findByID ABSENT** | Patrz §C1+findByID poniżej. |
| **A0a-naive** — gołe `set_config` na puli | ❌ FAIL | `set_config` na poolowym kliencie — każdy query to osobna implicit transakcja, GUC ginie |
| **A0a-tx (wewnątrz)** — `set_config` przez `BEGIN...COMMIT` | ✅ PASS | Działa na fixed connection z explicit transaction |
| **A0a-tx (po COMMIT)** — brak wycieku GUC | ✅ PASS | `set_config(..., true)` nie wycieka po COMMIT |
| **A0a-tx (real, create)** — set_config w beforeOperation dla create | ✅ PASS | transactionID PRESENT → set_config działa |
| **A0a-tx (real, find)** — set_config w beforeOperation dla find | ❌ FAIL | transactionID ABSENT → GUC ginie przed query |
| **A0b** — transakcyjne wrapowanie | ✅ RÓŻNIE | `create()` → JEDNO (wrapped), `find()` → OSOBNE (not wrapped) |
| **A1** — beforeOperation i afterRead hooki | ✅ PASS | Oba hooki odpalają się poprawnie |
| **A2c** — RLS + set_config + SQL query | ✅ PASS | Org-a widzi swoje strony, Org-b widzi swoje. **Spike użył `FORCE ROW LEVEL SECURITY` i połączył jako `saas_school`, nie owner.** Patrz §1 poniżej. |
| **A3** — PID withTenant vs PID hook Payloada | ✅ PASS — RÓŻNE | postgres.js PID≠pg PID. Osobne pule (oczekiwane) |
| **A3b** — PgBouncer port 6543 | ⏭️ SKIP | Wymaga Supabase transaction pooling — niedostępne w lokalnym dev |
| **A4** — goły `payload.db.drizzle` | ℹ️ NIEFILTROWANE | Potwierdza konieczność ESLint `no-restricted-imports` na `payload.db.drizzle` |
| **A5** — payload.find() Local API bez overrideAccess: false | ℹ️ NIEFILTROWANE | Potwierdza wrapper + ESLint na payload.find/findByID |
| **A6** — Admin Panel: req.organizationId z x-org-subdomain (łańcuch zaufania) | ⏭️ SKIP (spike) → **30a: GAP** | Wymaga pełnego stacka Payloada. Łańcuch: proxy.ts delete+set → payload-auth-strategy.ts odczyt → getOrgBySubdomain → req.organizationId. Kod poprawny, end-to-end niewytestowany. |
| **A6a** — Auth strategy weryfikuje membership user→org | **FIX APPLIED** ⚠️ | Brak membership checku = **priviledge escalation**: user z sesją .langlion.pl może czytać CMS każdej org przez zgadnięcie subdomeny. Fix: `getMembership(tx, orgId, userId)` przed ustawieniem organizationId. Kod poprawiony, end-to-end niewytestowany. |
| **B4** — UPDATE cudzego rekordu po ID (IDOR) | ⏭️ SKIP (spike) | Wymaga access.update + data dwóch org |
| **B5** — DELETE cudzego rekordu po ID (IDOR) | ⏭️ SKIP (spike) | Wymaga access.delete + data dwóch org |

### Kluczowe ustalenie: różnica między read a write

Payload wrapuje operacje modify (create/update/delete) w DB transaction (`req.transactionID` ustawione), ale **nie wrapuje read operacji** (find/findByID). Oznacza to:

- **Write ops:** `set_config('app.organization_id', $id, true)` w `beforeOperation` → GUC żyje do COMMIT → RLS działa
- **Read ops:** `set_config('app.organization_id', $id, true)` w `beforeOperation` → GUC ginie po hooku (auto-commit) → RLS **NIE** działa

**Konsekwencja: ochrona odczytów opiera się WYŁĄCZNIE na Payload access control (`access.read`).**

RLS dla odczytów (find/findByID) nie jest osiągalna przez `beforeOperation` hook, bo Payload nie wrapuje odczytów w transakcję. Session-scope `set_config(..., false)` w beforeOperation jako "drugie dno" nie jest realną warstwą ochronną — test A0a-naive (to samo: `set_config` na poolowym kliencie bez transakcji) zakończył się FAIL, a session scope na puli współdzielonej tworzy ryzyko wycieku GUC między requestami bez żadnej gwarancji atomowości. **Usunięte z rekomendacji.**

Dla odczytów:
1. **Jedyna linia obrony:** Payload access control (`access.read` z `organizationId`).
2. **Opcjonalnie:** `initTransaction(req)` w `beforeOperation` dla read ops — wymusza explicit transaction, co umożliwiłoby RLS. Koszt: transakcja na każdym odczycie.
3. **Integracja:** test C1 musi przejść na pełnym stacku przed F30a (niżej w raporcie).

### Kluczowe ustalenie: membership check w auth strategy

`payload-auth-strategy.ts` weryfikował TYLKO ważność sesji, a NIE przynależność usera do organizacji. Wektor:

1. Cookie sesji jest ustawione na `.langlion.pl` (root domain) — żeby user nie logował się osobno dla każdej subdomeny
2. User A (member Org A) wchodzi na `org-b.langlion.pl/admin`
3. Auth strategy: sesja ważna → `organizationId = org-b.id` → access control przepuszcza
4. **User A czyta CMS Org B bez żadnego membershipu** — privilege escalation przez zgadnięcie subdomeny

Fix (wzór: `context.ts:requireOrgAccess()`):
```ts
// Po resolvcie org z subdomeny, PRZED ustawieniem organizationId:
const membership = await withTenant(org.id, async (tx) =>
  getMembership(tx, org.id, session.user.id)
);
if (!membership || membership.status !== "active") return { user: null };
organizationId = org.id;
```

**Stan:** fix wgrany w `payload-auth-strategy.ts`, ale end-to-end niewytestowany (A6a = skip).

### Kluczowe ustalenie: ten sam wzorzec błędu w better-auth.ts

`src/lib/adapters/auth/better-auth.ts:190-200` — `staffSessionHandoffVerify` resolvował org z subdomeny, ale NIE sprawdzał membershipu przed `createSession`. Token TTL = 120s — w tym oknie membership może być suspended/removed. Fix: `getMembership` przez `withTenant` przed `createSession` + `console.warn` dla zdarzenia bezpieczeństwa. Testy w `better-auth-handoff.test.ts` (7 testów).

### Fidelity gap: lokalny Docker Postgres ≠ Supabase

**Wszystkie testy GUC/transakcji (A0a-tx, A0c, A0b) wykonano przeciwko lokalnemu Docker Postgres (port 5433), NIE przeciwko Supabase z Supavisorem.**

Supavisor w trybie session (port 5432) powinien zachowywać się jak długożyjące połączenie TCP, ale to założenie — test A3b (jedyny celujący w pooling) jest skip. Przed deployem F30a do stagingu:

- [ ] A0a-tx real create/find powtórzony na Supabase session poolingu
- [ ] A3b (PID sesji przy Supavisor transaction poolingu)
- [ ] A2c (RLS przez Supavisora)

## Faza 1: schemat generowany przez Payload

| Test | Wynik | Uwagi |
|------|-------|-------|
| **B1** — DDL: blocks jako jsonb? | ✅ **jsonb** | `blocks: jsonb("blocks")` — `blocksAsJSON: true` działa. Brak tabeli `pages_blocks` |
| **B1b** — round-trip JSON dla bloków | ✅ PASS | `payload.create({ blocks: [...] })` → `payload.findByID` → dane identyczne |
| **B2** — afterSchemaInit: kolumny tenantowe | ⏭️ SKIP | Wymaga `afterSchemaInit` w konfiguracji Payloada + migracji |
| **B3a** — EXPLAIN: RLS filtr obecny? | ✅ PASS | Filtr RLS widoczny w planie |
| **B3b** — psql: SET organization_id | ✅ PASS — TYLKO ORG-A | `SET app.organization_id = 'org-a'` → tylko wiersze org-a |

### Wygenerowany schemat

Plik: `docs/spike-30/generated-schema.ts` (Payload 3 generuje TypeScript Drizzle, nie SQL)

```ts
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull(),
  status: enum_pages_status("status").default("draft"),
  blocks: jsonb("blocks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Brak kolumn tenantowych** — `organization_id`, `created_by_user_id`, `deleted_at` muszą być dodane przez `afterSchemaInit`.

## Faza 2: access control Payloada — KLUCZOWA DLA BEZPIECZEŃSTWA ODCZYTÓW

| Test | Wynik | Uwagi |
|------|-------|-------|
| C1 — `access.read` z `organizationId` (integracja) | ✅ **INTEGRATION: PASS** (A0c-ext) | `createPayloadRequest + payload.find() z overrideAccess: false. Dwie organizacje, 3+1 stron (w tym Tx Test z A0c-ext). Kazda org widzi tylko swoje - 0 cross-org leakage. Jedyna warstwa ochrony odczytow dziala. RLS split policies (SELECT permissive) zweryfikowane - SELECT dziala bez GUC, INSERT bez GUC blokowany.t` → auth strategy → `payload.find()` z `overrideAccess: false`. Org-a widzi tylko 2 swoje strony, Org-b widzi 1 swoją. **Brak cross-org leakage.** Patrz §C1+findByID poniżej. |
| C2 — `beforeChange` nadpisuje `organizationId` | ⏭️ SKIP | defense-in-depth, może być dodane później. Wpływ na bezpieczeństwo: niski — `beforeChange` ustawia `organizationId` na danych przychodzących, ale `access.create` już wymaga `organizationId` w req. |
| **A0c-ext (C1+findByID)** — transactionID findByID | ✅ **findByID = ABSENT** | Potwierdzone przez beforeOperation hook capture. `findByID()` → ABSENT (identycznie jak `find()`). `create()` → PRESENT (kontrola pozytywna). |

**C1 PASS — potwierdzone (z RLS active):** `access.read` poprawnie filtruje przez pełny stack PayloadRequest + payload.find() z overrideAccess: false. Dwie organizacje, 3+1 stron (w tym Tx Test z A0c-ext). Kazda org widzi tylko swoje - 0 cross-org leakage. Jedyna warstwa ochrony odczytow dziala. RLS split policies (SELECT permissive) zweryfikowane - SELECT dziala bez GUC, INSERT bez GUC blokowany.

## RLS a odczyty — FIX APPLIED: split polityk, SELECT permissive, write z GUC

**Fix applied:** Migracja `0060_faza30a_cms_tables.sql` ustawia `FORCE ROW LEVEL SECURITY` na `pages`/`media`/`theme` z polityką `FOR ALL ... USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))`. Ponieważ read ops nie mają transakcji (A0c, A0c-ext), GUC `app.organization_id` NIGDY nie jest ustawiony dla SELECT. RLS porównuje `organization_id` z NULL → NULL, który nigdy nie jest TRUE → **każdy SELECT przez Payloada zwraca 0 wierszy**.

**Resolucja:** RLS musi być rozdzielony per-komenda — polityka `FOR SELECT` musi być permissive (bez wymogu GUC), a `FOR INSERT/UPDATE/DELETE` pozostaje z GUC:

```sql
-- SELECT: permissive — RLS nie chroni odczytów (celowo, zgodnie z decyzją architektoniczną)
CREATE POLICY "pages_tenant_isolation_select" ON "pages"
  FOR SELECT TO saas_school
  USING (true);

-- INSERT/UPDATE/DELETE: wymagają GUC (jedyna warstwa DB dla write)
CREATE POLICY "pages_tenant_isolation_write" ON "pages"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));
CREATE POLICY "pages_tenant_isolation_write" ON "pages"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));
CREATE POLICY "pages_tenant_isolation_write" ON "pages"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));
```

**Konsekwencja:** RLS daje zero ochrony dla odczytów — cała waga spada na `access.read` + ESLint fence przeciw surowemu `payload.db.drizzle`. To świadoma decyzja, udokumentowana w §"Rekomendacja architektoniczna".

**Verdict (zweryfikowane w C1 end-to-end z RLS active):** RLS chroni wyłącznie zapisy, odczyty wyłącznie przez access.read + ESLint fence. To świadoma decyzja architektoniczna, a nie przeoczenie. SELECT z `saas_school` bez GUC zwraca wszystkie wiersze (permissive policy). INSERT bez GUC jest blokowany przez RLS.

## Faza 3: storage

| Test | Wynik | Uwagi |
|------|-------|-------|
| S1 — upload → R2 prefix `org/{id}/` | ⏭️ SKIP | Wymaga custom StorageAdapter implementacji + MinIO |
| S2 — `media.file_id → file.id` FK | ⏭️ SKIP | Wymaga kolekcji media z FK do file |

## Faza 4: GraphQL API Payloada

| Test | Wynik | Uwagi |
|------|-------|-------|
| **G1** — GraphQL endpoint aktywny? | **DISABLED explicit** | `payload-config.ts: graphQL: { disable: true }`. Payload 3 domyślnie WŁĄCZA GraphQL pod `/api/graphql` (`defaults.js:51`). Żadna powierzchnia GraphQL nie była testowana w spike'u — wyłączenie jest świadomą decyzją. Jeśli w przyszłości GraphQL będzie potrzebne, testy A0c/A0a-tx/A2c muszą być powtórzone dla endpointów GraphQL (inna charakterystyka transakcji/poolingu). |

---

## Rekomendacja architektoniczna

**Wybrany wariant: WARIANT 1 (hybrydowy)**

**Write ops (create/update/delete):**
  beforeOperation → set_config('app.organization_id', $id, true) → RLS

**Read ops (find/findByID):**
  TYLKO Payload access control — ŻADNEJ zewnętrznej warstwy DB.
  RLS dla odczytów nie jest osiągalna (brak transakcji w Payloadzie).
  `initTransaction(req)` w beforeOperation to opcjonalny mikrooptimizacja,
  nie warstwa bezpieczeństwa.

Uzasadnienie:
- `set_config` przez transakcję działa (A0a-tx PASS, A0a-tx-real create PASS)
- Osobne pule `postgres.js` ↔ `pg` potwierdzone (A3 PASS)
- RLS na `pages` działa poprawnie (A2c PASS)
- `blocksAsJSON: true` generuje `jsonb` (B1 PASS, B1b PASS)
- Hooki beforeOperation/afterRead odpalają się (A1 PASS)
- Create wrapowany w transakcję (A0b PASS), Find nie (A0b)

**Rekomendowane podejście:**
1. **Write:** `beforeOperation` hook → `set_config('app.organization_id', req.organizationId, true)` → RLS filtruje automatycznie
2. **Read:** **Tylko** Payload access control (`access.read`/`access.update`/`access.delete`). Żadna warstwa DB nie chroni odczytów.
3. **Access control** na wszystkich kolekcjach jako JEDYNA linia obrony dla odczytów (obowiązkowo, potwierdzone w C1 integracja)
4. **`initTransaction(req)`** opcjonalnie dla read ops gdy potrzebna transakcyjna gwarancja RLS (koszt: transakcja na każdym odczycie)
5. **RLS policy split:** `FOR SELECT` = permissive (`USING (true)`), `FOR INSERT/UPDATE/DELETE` = wymaga GUC (`organization_id = current_setting(...)`)
6. **Admin Panel fix:** `payload-auth-strategy.ts` ustawia `req.organizationId` z `x-org-subdomain` (test A6)
7. **Membership fix:** auth strategy sprawdza `getMembership(tx, orgId, userId)` przed ustawieniem `organizationId` (test A6a) — bez tego user z root-domain cookie może czytać CMS każdej org (priviledge escalation)

**Uwaga:** session-scope `set_config(..., false)` został usunięty z rekomendacji — nie stanowi realnej warstwy ochronnej na puli współdzielonej (A0a-naive FAIL), a tworzy fałszywe poczucie bezpieczeństwa.

## Zabezpieczenia obowiązkowe (niezależnie od wariantu)

- [ ] ESLint `no-restricted-imports` na `payload.db.drizzle` poza `src/features/cms/tenant-payload.ts`
- [ ] ESLint `no-restricted-imports` na bezpośrednie `payload.find`/`payload.findByID` poza `tenant-payload.ts`
- [ ] ESLint `no-restricted-imports` na `getPayload` z pakietu `payload` poza `tenant-payload.ts` (przed F30a)
- [ ] Wrapper w `tenant-payload.ts` wymuszający `overrideAccess: false` (przed F30a)
- [ ] `organizationId` ZAWSZE z `req` (auth strategy), nigdy z body (F30a: potwierdzone w `payload-auth-strategy.ts`)
- [ ] `FORCE ROW LEVEL SECURITY` na każdej tabeli CMS (w migracji 0060) — **split polityk (FOR SELECT permissive, FOR INSERT/UPDATE/DELETE z GUC)** — patrz §"RLS a odczyty"
- [ ] Rola `saas_school` UTWORZONA w docelowej bazie z `NOBYPASSRLS` (produkcja Supabase: provisioning step, NIE tylko CI)
- [ ] Admin Panel: test A6 przed deployem F30a (łańcuch x-org-subdomain → req.organizationId)
- [ ] Admin Panel: test A6a przed deployem F30a (membership check — bez tego privilege escalation)
- [x] **C1 integracja: pełny stos Payloada, dwie orgi, `find()` przez API, potwierdzić separację** (jedyna warstwa ochrony odczytów) — **A0c-ext: PASS**
- [x] `findByID()` zweryfikowane dla transactionID (A0c rozszerzony o findByID) — **A0c-ext: ABSENT** (identycznie jak find)
- [x] RLS policy split: `FOR SELECT` = permissive, `FOR INSERT/UPDATE/DELETE` = wymaga GUC — migracja 0060 naprawiona i zweryfikowana
- [ ] GraphQL API: **disabled explicit** w `payload-config.ts` — decyzja spike'a, dokumentowana
- [ ] Supabase fidelity: A0a-tx/A2c powtórzone na realnym Supabase (session pooling) przed stagingiem
- [ ] Testy UPDATE/DELETE IDOR (B4/B5) przed Fazą 30c
- [ ] Test e2e izolacji przed każdą nową kolekcją Payloada
- [ ] `app.bypass_rls` furtka systemowa (wzór: `src/lib/db/system.ts`)

## Jawne asercje scope'u set_config i ryzyka

Dla każdego testu set_config dokumentujemy trzeci argument scope (`true` = local/transaction, `false` = session):

| Test | Scope (`3rd arg`) | Wynik | Skutek |
|------|-------------------|-------|--------|
| A0c (beforeOperation create) | N/A — sprawdzany fakt transakcji | RÓŻNIE | — |
| A0a-naive (gołe set_config na puli) | `false` (session) | ❌ FAIL | Każdy query osobna implicit transakcja, GUC ginie |
| A0a-tx (wewnątrz BEGIN/COMMIT) | `true` (local) | ✅ PASS | GUC utrzymany do COMMIT |
| A0a-tx (real, create) | `true` (local) | ✅ PASS | transactionID PRESENT → set_config przed COMMIT działa |
| A0a-tx (real, find) | `true` (local) | ❌ FAIL | transactionID ABSENT → GUC ginie przed query |
| A2c (RLS + SQL query) | `true` (local) | ✅ PASS | RLS filtruje poprawnie w transakcji |

**Ryzyko session scope (`false`) przy PgBouncer transaction pooling (port 6543):** GUC utrzymuje się na połączeniu poza transakcją. Jeśli PgBouncer zwróci to połączenie do puli, następny request (inny tenant) otrzymuje ten sam GUC → wyciek danych między tenantami. Zalecenie: używać `true` (transaction scope) ZAWSZE; dla read wymusić `initTransaction(req)`.

## Rola połączenia i FORCE ROW LEVEL SECURITY

**Dlaczego A2c/B3b PASS mimo braku FORCE w liście obowiązkowej?**

Bo FORCE BYŁ użyty w spike'u. Skrypt `spike-30-hooks-test.ts:412` wykonuje:
```sql
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;
```
i łączy się jako `saas_school` (linia 5: `PG_URL = "postgresql://saas_school:saas_school@...`), nie jako owner tabeli. RLS działał, bo FORCE + non-owner connection.

**[ ]** w liście zabezpieczeń (sekcja poniżej) dotyczy MIGRACJI PRODUKCYJNEJ (`0060_faza30a_cms_tables.sql`), która RÓWNIEŻ używa `FORCE` — potwierdzone w kodzie migracji. Lista jest planem do odhaczenia przed F30a, a spike już potwierdził, że mechanizm jest poprawny.

**Rola `saas_school` w produkcji:**

Migracja `0060_faza30a_cms_tables.sql:16-18` sprawdza istnienie roli i RAISUJE błąd jeśli brak — NIE tworzy jej. Rola jest tworzona przez:
- **Lokalny dev:** `docker/postgres-init/01-app-role.sql`
- **CI:** `.github/workflows/ci.yml:129` — jawny SQL
- **Produkcja Supabase:** musi być utworzona manualnie jako provisioning step, udokumentowane w `docs/architecture/operations-and-local-setup.md` ("Two database URLs (RLS)")

Weryfikacja przed deployem: `\du` w psql — `saas_school` musi mieć `NOBYPASSRLS` i `NOSUPERUSER`.

**✅ FORCE ROW LEVEL SECURITY split polityki (FIX APPLIED w migracji 0060):**

Migracja 0060 została naprawiona: split polityk `FOR SELECT` (permissive) i `FOR INSERT/UPDATE/DELETE` (GUC). Potwierdzone w C1 end-to-end z RLS active.

**Migracja 0060 fix (zastosowany i zweryfikowany):**
- `FOR SELECT` → `USING (true)` (permissive — RLS nie chroni odczytów, to celowe)
- `FOR INSERT/UPDATE/DELETE` → istniejąca klauzula GUC (jedyna warstwa DB dla write)
- `system_bypass` → pozostaje `FOR ALL` (obie ścieżki)

Patrz §"RLS a odczyty — FIX APPLIED" powyżej.

## Rekomendacja portu Supabase

Rekomendowany port: **5432** (session pooling).

> ⚠️ **Cała rekomendacja opiera się na założeniu, że Supavisor w trybie session (port 5432) zachowuje się jak zwykłe długożyjące połączenie TCP.** A3b (jedyny test celujący w pooling) jest skip. Przed deployem do stagingu kluczowe testy muszą przejść przeciwko realnemu Supabase.

Port 6543 (transaction pooling) nie był testowany — wymaga Supabase. Jeśli w produkcji używany jest PgBouncer w trybie transaction pooling, test A3b musi być wykonany przed deployem, a `set_config(..., true)` staje się wymogiem (nie tylko zaleceniem) — transaction pooling nie utrzymuje sesji między query, więc session-scope `false` by wyciekał między tenantami.

## Stan połączeń

| Parametr | Wartość |
|----------|---------|
| Baseline aplikacji (postgres.js) | ~2-5 (idle) |
| Payload (pg pool max) | 3 |
| Łącznie | ~5-8 |
| Limit Supabase Free | 15 |
| W limicie? | ✅ TAK (z zapasem) |

## Lista plików spike'a

| Plik | Cel |
|------|-----|
| `src/features/cms/spike-config.ts` | Minimalna konfiguracja Payloada (kolekcja `pages` + `blocksAsJSON: true`) |
| `src/features/cms/payload-auth-strategy.ts` | Auth strategy (fix: req.organizationId z x-org-subdomain) |
| `src/features/cms/tenant-payload.ts` | Wrapper dla Local API + ESLint bypass |
| `src/features/cms/tenant-payload.test.ts` | 17 testów wrappera + ESLint regression |
| `src/features/cms/payload-auth-strategy.test.ts` | 12 testów membership checku w auth strategy |
| `src/lib/adapters/auth/better-auth-handoff.test.ts` | 7 testów membership checku w staff handoff |
| `src/features/cms/payload-config.test.ts` | 19 testów access control na 3 kolekcjach |
| `src/app/api/dev/cms-isolation-probe/route.ts` | API endpoint testów e2e (seed + probe) |
| `e2e/cms-tenant-isolation.spec.ts` | 2 testy e2e (concurrent Promise.all, 6/10 probe) |
| `eslint.config.mjs` | no-restricted-imports (severity: error) |
| `scripts/spike-30-runner.ts` | Skrypt wykonujący testy L1–B3b + A6/B4/B5 skippy |
| `scripts/spike-30-hooks-test.ts` | Skrypt testujący hooki Payloada (A0c–A2c, B1b) |
| `docs/spike-30/raport.md` | Niniejszy raport |
| `docs/spike-30/generated-schema.ts` | Wygenerowany schemat Drizzle przez Payload |
| `scripts/spike-30-c1-findbyid.ts` | **NOWY** — C1 integracja + A0c-ext findByID transactionID (oba ✅ PASS) |
