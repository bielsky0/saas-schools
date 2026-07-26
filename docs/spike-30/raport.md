# Raport: Faza 30-spike — Weryfikacja Payload CMS + izolacja tenantowa

**Data:** [DATA]
**Baza:** Supabase (plan: [FREE/PRO], limit połączeń: [N])
**Sterownik aplikacji:** postgres.js
**Sterownik Payloada:** node-postgres (pg) przez @payloadcms/db-postgres
**Wersja Payloada:** [X.Y.Z]

---

## Faza -1: limit połączeń Supabase

| Test | Wynik | Uwagi |
|------|-------|-------|
| L1 — limit planu | `[N]` | |
| L2 — baseline aplikacji | `[M]` połączeń | |
| L3 — aplikacja + Payload | `[K]` połączeń | Payload pool: max=[X] |
| L4 — zmieściliśmy się w limicie? | PASS / FAIL | |

## Faza 0: tożsamość transakcji i połączenia

### A0: transakcje Payloada

| Test | Wynik | Uwagi |
|------|-------|-------|
| A0c — req.transactionID obecne? | PRESENT / ABSENT | Dowód: Payload [jest/nie jest] w transakcji przed hookiem |
| A0a-naive — gołe `set_config` w hooku | PASS ('spike-test') / FAIL (pusta) | `set_config` przez payload.db.drizzle, bez jawnej transakcji |
| A0a-tx — `set_config` przez `beginTransaction(req)` | PASS / FAIL / N/A (jeśli A0c=ABSENT) | Tylko jeśli A0c=PRESENT |
| A0b — log statement: BEGIN/COMMIT | JEDNO / OSOBNE | |

### A1: tożsamość połączenia

| Test | Wynik |
|------|-------|
| A1 — PID beforeOperation vs afterRead | SAME / RÓŻNE |

### A2: test end-to-end RLS

| Test | Wynik |
|------|-------|
| A2c — `set_config` + `payload.find` z RLS | TYLKO ORG-A / WSZYSTKIE / ZERO WIERSZY |

### A3: porównanie pul

| Test | Wynik |
|------|-------|
| A3 — PID withTenant (postgres.js) vs PID hook Payloada | SAME / RÓŻNE |

### A3b: PgBouncer (port 6543)

| Test | Wynik vs 5432 |
|------|---------------|
| A0a-naive na 6543 | TAKI SAM / RÓŻNY |
| A0a-tx na 6543 | TAKI SAM / RÓŻNY / N/A |
| A1 na 6543 | TAKI SAM / RÓŻNY |

### A4: goły payload.db.drizzle

| Test | Wynik | Uwagi |
|------|-------|-------|
| A4 — `payload.db.drizzle` bez `payload.find` | NIEFILTROWANE / FILTROWANE | Oczekiwane: NIEFILTROWANE (potwierdza konieczność ESLint) |

## Faza 1: schemat generowany przez Payload

| Test | Wynik | Uwagi |
|------|-------|-------|
| B1 — DDL (blocksAsJSON=true): blocks jako jsonb czy osobne tabele? | [jsonb / osobne] | Patrz docs/spike-30/generated-schema.sql |
| B1b — round-trip JSON dla bloków | PASS / FAIL | |
| B2 — afterSchemaInit: organization_id, created_by_user_id, deleted_at obecne? | PASS / FAIL | Czy Payload nie mapuje ich na pola konfiguracyjne? |
| B3a — EXPLAIN: RLS filtr obecny? | PASS / FAIL | |
| B3b — psql: SET organization_id → tylko wiersze tej org? | PASS / FAIL | |

## Faza 2: access control Payloada

| Test | Wynik | Uwagi |
|------|-------|-------|
| C1 — `access.read` z `organizationId: { equals }` | PASS / FAIL | |
| C2 — `beforeChange` nadpisuje organizationId z body | ORG-A (nadpisane) / ORG-B (błąd) | |

## Faza 3: storage

| Test | Wynik | Uwagi |
|------|-------|-------|
| S1 — upload → R2 prefix org/{id}/ | PASS / FAIL | |
| S2 — media.file_id → file.id FK | PASS / FAIL | |

---

## Rekomendacja architektoniczna

**Wybrany wariant:** [WARIANT 1 / WARIANT 2 / WARIANT 3]

Uzasadnienie:
- Kluczowe testy: A0a-tx=[PASS/FAIL], A0c=[PRESENT/ABSENT], A1=[SAME/RÓŻNE]
- ...

## Zabezpieczenia obowiązkowe

- [ ] ESLint no-restricted-imports na `payload.db.drizzle` poza `src/features/cms/tenant-payload.ts`
- [ ] `organizationId` ZAWSZE z `req` (middleware), nigdy z body
- [ ] Test e2e izolacji przed każdą nową kolekcją Payloada

## Rekomendacja portu Supabase

Rekomendowany port: 5432 / 6543.
Uzasadnienie: [wyniki A3b]

## Stan połączeń

- Baseline aplikacji: [M]
- Payload (max pool): [K_payload]
- Łącznie: [M + K_payload]
- Limit planu: [N]
- W limicie: TAK / NIE (jeśli NIE: rekomendacja dot. rozmiaru pul)
