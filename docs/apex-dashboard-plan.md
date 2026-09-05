# Apex Dashboard — plan wdrożenia

Zarządzanie klientami (tenantami) i ich ustawieniami z poziomu panelu super-admina
na `apex.pl`. Stan: plan zatwierdzony (burza mózgów → agregacja do faz).

## Decyzje (potwierdzone)

1. **Model tenancy bez zmian.** Tenant jest rozstrzygany z nagłówka `Host`
   (`served-org.ts`); „przełączenie kontekstu" = filtr `orgId` w URL
   `/admin/orgs/{orgId}`, nie zmiana sesji/hostu. Account switcher (F4.6)
   pozostaje usunięty.
2. **Konsola Klienta z pełnymi prawami edycyjnymi** (nie read-only). Apex edytuje
   ustawienia klienta i stronę w builderze z poziomu `apex.pl/admin/{orgId}`.
3. **Warstwa dodawcza.** Nowe akcje w `features/admin/org-console/` z guardem
   `requireSuperAdmin()` + jawny `orgId`. Nie dotykamy istniejących org-actions,
   `served-org.ts`, sesji, proxy.
4. **Wspólny model grup.** Jedna tabela grup klientów dla feature flags, limitów
   i kuponów.
5. **SSO odpada.** Klucze API / Webhooki klienta poza zakresem (brak encji;
   jeśli tabele nie istnieją → backlog).

## Co już istnieje (fundament, nie ruszamy)

| Obszar | Pliki |
|---|---|
| Super-admin guard | `src/features/admin/context.ts` (`requireSuperAdmin`) |
| Audit log | `src/features/admin/audit.ts` (`recordAudit`, Rule A/B, `withImpersonation`, `changed`) |
| Listy users/orgs + szczegóły | `src/features/admin/data.ts` |
| Plan CRUD + limity + feature flags + org overrides | `src/features/admin/plans-data.ts` |
| Limity i flagi w runtime | `src/features/billing/limits.ts` (`getEffectiveLimit`, `hasFeature`) |
| Impersonation (user-level) | `src/features/admin/actions.ts` |
| RBAC | `src/features/rbac/`, `src/features/organizations/context.ts` |
| RLS + bypass | `src/lib/db/tenant.ts` (`withTenant`), `src/lib/db/system.ts` (`withSystemBypass`) |
| CMS strony + builder | `src/lib/db/schema/pages.ts`, `src/app/(builder)/editor/` |

## Wzorce obowiązujące we wszystkich fazach

### Nowe GLOBAL tabele — wzorzec RLS

- **Uwaga (research):** migracja `0028_faza9_plans_limits.sql` używa GUC
  `app.is_system_bypass`, ale `withSystemBypass` (`system.ts`) ustawia
  `app.bypass_rls='on'`. Migracje 0015–0017 i 0069 używają poprawnie
  `app.bypass_rls`. **Nowe tabele idą za wzorcem 0015/0069**
  (`coalesce(current_setting('app.bypass_rls', true),'')='on'`), NIE za 0028.
  Konfirmacja w Fazie 0: bug 0028 jest REALNY (writes do `plan`/override blokowane
  przez RLS) i miał drugą połowę — policy `organization_limit_override_tenant_isolation`
  bez `missing_ok` rzucała 42704 na transakcjach super-admina. Oba aspekty naprawia
  `0084_faza_admin_fix_rls_0028.sql` (weryfikacja live: insert bez bypass = 42501,
  upsert przez bypass = OK).

### Migracje

- Ręczny SQL; `drizzle-kit push` **zabronione** (niszczy RLS/EXCLUDE/GRANT).
- Po każdej migracji: monotoniczność `when` w `meta/_journal.json`.
- Nowe tabele: `text id DEFAULT gen_random_uuid()`, `timestamptz DEFAULT now()`.
- Eksporty w `schema/index.ts` muszą być globalnie unikalne (precedens kolizji
  `session`). Nowe moduły: `admin-client-groups.ts`, `admin-feature-flags.ts`,
  `admin-coupons.ts`, `admin-setting-overrides.ts`, `page-versions.ts`.

### Audit

- Każda mutacja: `requireSuperAdmin()` pierwsza linia → `recordAudit` (Rule A gdy
  efekt nasz, Rule B gdy efekt to auth engine).
- Actor: `{ actorType: "SuperAdmin", actorId, actorEmail }`.
- Nowe akcje i target types rozszerzają `admin/audit.ts`.

### ESLint fence

- Nowe cross-tenant moduły dodać do ignore-listy bloku `withSystemBypass`
  w `eslint.config.mjs` (blok ~linie 226–273) z uzasadnieniem w nagłówku modułu.

---

## FAZA 0+1 — Fundament danych: grupy, feature flags, kupony, overrides, page_versions + audit

### 0.1 `admin_client_group` — `src/lib/db/schema/admin-client-groups.ts`
```
id          text PK DEFAULT gen_random_uuid()
name        text NOT NULL
slug        text NOT NULL UNIQUE
description text
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
```
GLOBAL (no org_id). RLS: bypass-only writes (`app.bypass_rls`).

### 0.2 `admin_client_group_member`
```
id               text PK
group_id         text NOT NULL FK -> admin_client_group.id ON DELETE CASCADE
organization_id  text NOT NULL FK -> organization.id ON DELETE CASCADE
added_by_user_id text NOT NULL FK -> user.id
created_at       timestamptz NOT NULL DEFAULT now()
UNIQUE (group_id, organization_id)
```
GLOBAL (org_id jest kluczem biznesowym, nie właścicielem RLS). Index na
`organization_id`.

### 0.3 `admin_feature_flag` (słownik)
```
id             text PK
key            text NOT NULL UNIQUE        -- 'export_csv', 'ai_assistant'
label          text NOT NULL
description    text
enabled_global boolean NOT NULL DEFAULT false  -- warstwa 3 (OFF domyślnie)
condition      jsonb                       -- { metric:'members', gte:1000 } | NULL
created_at     timestamptz NOT NULL DEFAULT now()
```
GLOBAL. RLS bypass-only writes; SELECT przez `withSystemBypass`.

### 0.4 `admin_feature_flag_value` (serce dziedziczenia)
```
id          text PK
feature_key text NOT NULL FK -> admin_feature_flag.key ON DELETE CASCADE
scope       text NOT NULL                  -- 'group' | 'organization'
scope_id    text NOT NULL                  -- group_id lub organization_id
enabled     boolean NOT NULL
UNIQUE (feature_key, scope, scope_id)
```
GLOBAL. Brak wiersza = brak override (dziedziczenie). Zapis bypass-only.

### 0.5 `admin_coupon`
```
id                text PK
code              text NOT NULL UNIQUE
type              text NOT NULL              -- 'percent' | 'amount'
value             integer NOT NULL           -- procent 0-100 lub kwota w minor units
currency          text                       -- dla 'amount'
expires_at        timestamptz                -- NULL = bez ważności
max_activations   integer                    -- NULL = bez limitu
scope             text NOT NULL              -- 'global' | 'group' | 'organization'
scope_id          text
created_by_user_id text NOT NULL FK -> user.id
created_at        timestamptz NOT NULL DEFAULT now()
```

### 0.6 `admin_coupon_redemption`
```
id                    text PK
coupon_id             text NOT NULL FK -> admin_coupon.id ON DELETE CASCADE
organization_id        text NOT NULL FK -> organization.id
activated_at          timestamptz NOT NULL DEFAULT now()
activated_by_user_id  text
```

### 0.7 `admin_client_setting_override` (diff + reset)
```
id                 text PK
organization_id    text NOT NULL FK -> organization.id ON DELETE CASCADE
setting_key        text NOT NULL
value_json         jsonb NOT NULL
default_value_json jsonb NOT NULL     -- snapshot domyślnej przy tworzeniu override
created_at         timestamptz NOT NULL DEFAULT now()
UNIQUE (organization_id, setting_key)
```

### 0.8 `page_version` (wersjonowanie CMS)
```
id                 text PK
page_id            text NOT NULL FK -> page.id ON DELETE CASCADE
blocks_json        jsonb NOT NULL
seo_json           jsonb
title              text NOT NULL
status_snapshot    text NOT NULL      -- 'draft'|'published'
created_by_user_id text NOT NULL FK -> user.id
comment            text
created_at         timestamptz NOT NULL DEFAULT now()
```
Tenant-scoped przez `page_id`. Zapis w `withTenant(page.organizationId)`.

### 0.9 Migracje
- `0084_faza_admin_fix_rls_0028.sql` — fix RLS 0028 (DWA aspekty buga, potwierdzone
  na żywej bazie w Fazie 0): (1) `*_system_bypass` na `app.bypass_rls`, (2)
  `organization_limit_override_tenant_isolation` używał `current_setting('app.organization_id')`
  bez `true` (missing_ok) → 42704 przy każdym zapisie przez `withSystemBypass`; poprawione
  na idiom 0015 `nullif(current_setting(..., true), '')`.
- `0085_faza_admin_client_groups.sql` — 0.1–0.2 (+ indexy + RLS `app.bypass_rls`).
- `0086_faza_admin_feature_flags.sql` — 0.3–0.4.
- `0087_faza_admin_coupons.sql` — 0.5–0.6.
- `0088_faza_admin_setting_overrides.sql` — 0.7.
- `0089_faza_page_versions.sql` — 0.8 (+ RLS tenant isolation przez subquery na
  `page.organization_id`, wzorzec 0069).
- Aktualizacja `meta/_journal.json` (monotoniczny `when`).

### 0.10 Silnik dziedziczenia — `src/features/admin/flags.ts`
```ts
// Wszystko cross-tenant → withSystemBypass + requireSuperAdmin na brzegu.
hasFeature(orgId, featureKey): boolean
  orgOverride   = admin_feature_flag_value[organization, orgId]?.enabled
  groupOverride = najwyższy priorytet wśród grup org
                  (enabled=true wygrywa; inaczej najnowsza grupa)
  result = orgOverride ?? groupOverride ?? enabled_global ?? false  // fail-closed

getEffectiveFlagMatrix(): MatrixRow[]   // dla /admin/feature-flags
  wiersze = flagi; kolumny = Global | Grupy | Org; każda komórka = źródło

getOrgGroups(orgId): string[]           // group ids org (dla flag/limitów/kuponów)
conditionMet(flag, orgId): boolean      // flagi warunkowe (metric z getResourceUsage)
```

### 0.11 Rozszerzenie `admin/audit.ts`
Nowe `AuditAction`:
- `client_group.create/update/delete`, `client_group_member.add/remove`
- `feature_flag.create/update/delete`, `feature_flag_value.set` (metadata
  `{featureKey, scope, scopeId, from, to}`)
- `coupon.create/update/delete`, `coupon.redemption.remove`
- `org_setting_override.set/reset` (diff: `{settingKey, from, to, default}`)
- `page_version.create/publish/rollback`

Nowe `AuditTargetType`: `client_group`, `feature_flag`, `coupon`,
`coupon_redemption`, `org_setting_override`, `page_version`.

### 0.12 ESLint
Dodać do ignore-listy system-bypass: `src/features/admin/flags.ts`,
`src/features/admin/groups.ts`, `src/features/admin/coupons.ts`,
`src/features/admin/org-console/**`, builder API.

### 0.13 Testy
- `features/admin/flags.test.ts` — pure logic dziedziczenia (mocked DAL).
- Test RLS: nowe tabele nie są czytelne bez bypassa.

---

## FAZA 2 — CRUD Tenants i Groups (panel)

### 2.1 Rozszerzenie `/admin/organizations`
- `admin/schema.ts`: `orgListQuerySchema` + `status` (`all|active|suspended|trial`),
  `plan` (string), `from`/`to` (data rejestracji).
- `admin/data.ts` `listAllOrganizations`: filtry przez subqueries na
  `subscription.status` / `subscription.planId` (wzorzec istniejącego subquery).
  Propozycja semantyki statusu: `trial`=`trialing`, `active`=`active`,
  `suspended`=`ban/deleted`.

### 2.2 `/admin/organizations/[orgId]` — zakładki
- Layout `Tabs` (`@/components/ui`): **Dane | Płatności i faktury | Grupy |
  Ustawienia | Konsola**.
- Dane: istniejące metrics + editable `timezone/currency/planId`
  (`updateOrgDetailAction` w org-console).
- Płatności: tabela `billing_payment` — `listOrgPayments(orgId)` w `admin/data.ts`.

### 2.3 `/admin/groups`
- `src/features/admin/groups.ts` — data: `listGroups`, `listGroupMembers`,
  `listOrgGroups`.
- `src/features/admin/groups-actions.ts` — CRUD grup + `addOrgToGroupAction` /
  `removeOrgFromGroupAction` (`requireSuperAdmin` + Rule A audit).
- Trasy: `/admin/groups/page.tsx`, `/admin/groups/[groupId]/page.tsx`.
- Drag-and-drop klientów między grupami: `group-members-dnd.tsx`.

### 2.4 `admin-nav.tsx`
Dodać zakładki: Groups, Feature Flags, Coupons, Limits.

---

## FAZA 3 — Feature Flags z dziedziczeniem (serce)

### 3.1 `/admin/feature-flags`
- `page.tsx` (server): `requireSuperAdmin` → `getEffectiveFlagMatrix()`.
- `feature-flags-client.tsx`: **Matrix View** — wiersze flagi, kolumny
  Global | Grupy | (dropdown klient). Toggle per komórka.
- `feature-flags-actions.ts`: `setGlobalFlagAction`, `setGroupFlagAction`,
  `setOrgFlagAction`, `createFeatureFlagAction`, `deleteFeatureFlagAction`
  (Rule A audit z `from`/`to`).

### 3.2 Flagi warunkowe
- Pole `condition` (`{metric, gte}`) w formularzu flagi.
- `conditionMet(orgId, flag)`: `getResourceUsage(orgId, metric)` vs `gte`.
- UI: kolumna „Warunek" + wskaźnik.

---

## FAZA 4 — Konsola Klienta (rdzeń) — warstwa dodawcza

### 4.1 Moduł `src/features/admin/org-console/`
Wzorzec akcji:
```ts
const ctx = await requireSuperAdmin(`/admin/orgs/${orgId}/console/...`);
const parsed = schema.safeParse({ orgId, ... });   // orgId z URL
const org = await getOrganizationDetail(parsed.orgId);
if (!org) return { error: "Org not found" };
// writes → withTenant(orgId) lub withSystemBypass wg tabeli
// audit → recordAudit(tx, { actor: SuperAdmin, organizationId: orgId, ... })
```
Pliki: `settings-actions.ts`, `teams-actions.ts`, `limits-actions.ts`,
`pages-actions.ts`, `index.ts`.

### 4.2 Trasy `/admin/orgs/[orgId]/console/...`
- `layout.tsx`: sidebar sekcji + nagłówek „Konsola: {org.name}".
- `settings/page.tsx` — ustawienia org: `updateOrgSettingsAction` (name, timezone,
  currency, schedule bounds, subdomain, planId) + zapis do
  `admin_client_setting_override` gdy wartość ≠ default (diff).
- `teams/page.tsx` — użytkownicy klienta: `addTeamUserAction` (invite lub ręczne
  hasło przez `adminAuthAdapter`), `changeRoleAction`, `suspendMemberAction`,
  `setMemberPermissionOverrideAction`.
- `groups/page.tsx` — group types klienta: CRUD analog istniejących akcji
  (reuse `features/groups/schema.ts`). **To są grupy wewnętrzne (tenant-scoped),
  NIE `admin_client_group`** — rozróżnienie oznaczone badge.
- `limits/page.tsx` — **Diff view**: `getEffectiveLimit` + `getResourceUsage` +
  źródło. Akcje: `upsertOrgOverrideAction`/`deleteOrgOverrideAction` (istnieją).
- `credits/page.tsx` — doładowanie kredytów (reuse grant flow, audit `credit.grant`).
- `pages/page.tsx` — CMS: lista stron org, publish/rollback przez `page_version`.

### 4.3 Builder z apexa — `/admin/orgs/[orgId]/builder`
- **Nowa trasa API** `src/app/(builder)/admin-editor/api/route.ts`: port logiki
  z `src/app/(builder)/editor/api/route.ts` — tenant z URL zamiast
  `ORG_SUBDOMAIN_HEADER`, guard `requireSuperAdmin()`, `withTenant(orgId)`,
  zapisy audit-logged. Sugestia: wspólny rdzeń do
  `src/features/cms/builder-actions.ts` (orgId jako parametr), rdzeń wołany przez
  2 cienkie warstwy (tenant-route + admin-route). **Równoległa ścieżka, nie
  modyfikacja tenant-route.**
- **Strona**: `/admin/orgs/[orgId]/builder/page.tsx` → render tej samej
  `ChaiWebsiteBuilder` (client) z API base `admin-editor/api`. Fork SDK = pełna
  kontrola punktu API.
- **Uwaga techniczna:** builder to ciężki client (dynamic, ssr:false). Do
  weryfikacji w spike'u czy da się postawić wewnątrz `(admin)` shell.

### 4.4 Impersonation (user-level)
Zostaje jako narzędzie awaryjne. W konsoli przycisk „Zaloguj jako user" →
istniejąca akcja (audit-logged, banner).

---

## FAZA 5 — Limity (diff), Kupony i Rabaty

### 5.1 `/admin/limits`
- Globalne listowanie override'ów + **override per grupa** — NOWA tabela
  `admin_client_group_limit_value (group_id, limit_key, limit_value)` (analog
  flag; nie modyfikujemy istniejącej `organization_limit_override`).
- Priority w `getEffectiveLimit`: **org override → group override → plan →
  fail-closed**.

### 5.2 `/admin/coupons`
- `coupons.ts`: `listCoupons`, `getCoupon`, `listOrgRedemptions`,
  `listOrgActiveCoupons`.
- `coupons-actions.ts`: `createCouponAction`, `updateCouponAction`,
  `deleteCouponAction`, `removeRedemptionAction`.
- Trasy: `/admin/coupons/page.tsx`, `[couponId]/page.tsx`.
- „Aktywne rabaty" na koncie klienta: sekcja w Konsoli.

---

## FAZA 6 — CMS wersjonowanie

### 6.1 Akcje
- `createPageVersionAction(pageId, comment)` — snapshot przed edycją (Rule A).
- `publishPageVersionAction(pageVersionId)` — `page.status='published'`,
  blocks = wersja; audit `page.publish`.
- `rollbackPageVersionAction(pageVersionId)` — blocks/seo/title z wersji →
  strona; audit `page_version.rollback`.
- Zapis wersji przy save w admin-editor API („autosave"). Sprawdzić wzorzec
  `0068_autosave_pages_v.sql`.

### 6.2 UI
- Konsola → `pages/page.tsx`: status/draft/ostatnia wersja + Publish/Rollback.
- Timeline wersji: `[pageId]/versions` + „przywróć".

---

## FAZA 7 — UX cross-cutting

### 7.1 Sidebar (`admin-nav.tsx`)
`Przegląd /admin | Klienci /admin/organizations | Grupy /admin/groups |
Kupony /admin/coupons | Feature Flags /admin/feature-flags |
Limity /admin/limits | Konsola (per org) | Logi /admin/audit | CMS Blocks`.

### 7.2 Przegląd `/admin`
- `admin/data.ts`: `getDashboardStats()` — count klientów, aktywne subskrypcje,
  API calls, aktywne kupony, liczba grup.

### 7.3 Globalne wyszukiwanie (Cmd+K)
- `command-menu.tsx` + `searchGlobal(q)` w `admin/data.ts` (orgi, userzy, kupony,
  flagi). Skrót `⌘K`.

### 7.4 Bulk Actions
- `/admin/organizations`: checkboxy + toolbar. Akcje: `bulkApplyCouponAction`,
  `bulkSetFlagAction`, `bulkAddToGroupAction` — audit jako jeden wpis z `count`
  (wzorzec `session.mass_reassign_trainer`).

### 7.5 Diff view
- Wbudowany w Konsola → Limits i Settings: wartość obok domyślnej + badge
  „override".

---

## Kolejność wdrożenia

```
Faza 0+1 (schema+silnik)  →  Faza 2 (CRUD)  →  Faza 3 (flags)  →  Faza 4 (konsola)
                                                    ↘  Faza 5 (limity/kupony)  →  Faza 7 (UX)
                                                Faza 6 (versions) — zależna od 4.3/4.2 pages
```

Faza 4 jest największa — cięcie: 4.1/4.2 (settings/teams/limits) → 4.3 (builder)
→ 4.4. Faza 5.1 zależy od `flags.getOrgGroups` (0.10). Faza 6 zależy od
`page_version` (0.8) i ścieżki zapisu w admin-editor (4.3).

## Ryzyka i otwarte decyzje

1. **GUC 0028 (`is_system_bypass` vs `bypass_rls`)** — latentny bug POTWIERDZONY
   i NAPRAWIONY w Fazie 0 (migracja 0084, oba aspekty — w tym 42704 od
   `current_setting` bez missing_ok). Weryfikacja live opisana w §0.9.
2. **Status org (Aktywny/Zawieszony/Trial)** — brak dziś statusu org; źródło
   prawdy do zdefiniowania (subscription vs. ban vs. deletedAt).
3. **Builder w `(admin)` shell** — ciężki client SDK; możliwy konflikt z layoutem
   `(admin)`. Spike w 4.3.
4. **Ręczne hasło użytkownika (4.2 teams)** — `adminAuthAdapter` ma
   suspend/impersonate; sprawdzić createUser/setPassword; inaczej tylko invite.
5. **`admin_client_setting_override` vs kolumny `organization`** — ustawienia
   bazowe (timezone, currency, schedule*) update'ujemy wprost; override to
   rozszerzenie na przyszłe klucze. Diff dotyczy tylko override'ów.