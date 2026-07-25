### Faza 20 — Wynagrodzenia trenerów, wyłącznie informacyjne (EPIK 32, v15)

**Status:** ✅ zakończona (2026-07-25)
**Cel:** akademia widzi, ile jest winna każdemu trenerowi za wybrany okres; rozliczenie odbywa się poza systemem.
**Pokrywa:** EPIK 32 (w tym **US-32.6, v17 — stawka godzinowa**); §2.30, **§2.37**; §2.10 (uprawnienia `trainer_rates.manage`, `trainer_earnings.view`); Constraint 8 (§1.3).
**Zależności:** **F6** — kwalifikacja sesji do raportu opiera się na `attendance_status`, więc bez danych frekwencyjnych raport nie ma na czym pracować. Pośrednio F2 (`group_type` dla stawek nadpisujących).
**Zakres:** tabela `trainer_rate` (`organization_id`, `trainer_id`, `group_type_id` nullable, `amount` integer, `effective_from`, **`rate_type` enum `flat_per_session`\|`hourly` default `flat_per_session` — v17**) + RLS wg wzorca `*_tenant_isolation`/`*_system_bypass` z migracji `0015`; przed dodaniem tabeli **grep po katalogu schematu** pod kątem kolizji nazw eksportów (ryzyko #7, D11); dwa uprawnienia w statycznej mapie RBAC; CRUD stawek dla Owner/Admin (zmiana = nowy rekord z własnym `effective_from`, nigdy UPDATE); raport za zakres dat — suma po sesjach, gdzie trener był prowadzącym ORAZ ≥1 `booking` ma `attendance_status != 'unmarked'`, stawka rozstrzygana wg Constraint 8; **kwota sesji liczona wg `rate_type` wygrywającego wiersza `trainer_rate`: `flat_per_session` = `amount`, `hourly` = `amount × (end_time - start_time)`** (§2.37, US-32.6); ograniczenie trenera do własnych danych egzekwowane na backendzie.
**Zakres dołożony w v17 (poprawka #9, stawka godzinowa):** `rate_type` per `trainer_rate` (Rozstrzygnięcie #28 spec — nie per trener globalnie), wchodzi **od razu z pierwszą migracją `trainer_rate`** (nie osobna migracja additive), bo tabela i tak powstaje tu po raz pierwszy. Zmienia wyłącznie **przeliczenie kwoty** — nie wersjonowanie, nie kwalifikację sesji, nie Constraint 8.
**Świadomie poza zakresem:** jakakolwiek płatność, wypłata, transfer czy operacja na którymkolwiek z dwóch kont Stripe (US-32.5). To kalkulator raportowy, nie payroll.
**DoD:** e2e: admin definiuje stawkę bazową i nadpisanie per typ grupy → raport liczy poprawnie; podniesienie stawki nie zmienia raportu za miniony okres (US-32.2/AC3); sesja bez żadnego oznaczenia obecności nie jest liczona, a sesja z samymi `absent` jest; trener widzi wyłącznie własne dane i dostaje odmowę z backendu przy próbie pobrania cudzych.
**DoD — jawny punkt:** lista sesji **bez rozstrzygniętej stawki** (US-32.3/AC4) jest widoczna **w UI admina** jako wyodrębniona sekcja raportu, nie tylko obecna w strukturze odpowiedzi API. Sesja bez stawki nie może zostać policzona jako zero ani zniknąć z raportu bez śladu — admin ma zobaczyć, że konfiguracja wymaga uzupełnienia.
**DoD — v17 (stawka godzinowa, US-32.6):** raport liczy poprawnie oba `rate_type` dla tego samego trenera — sesja 90 min z `hourly` = `amount × 1,5`, sesja z `flat_per_session` = `amount` niezależnie od długości; podniesienie stawki godzinowej od nowego sezonu nie zmienia raportu za miniony okres (nieretroaktywność jak dla ryczałtu).

**⚠️ Blast radius (poprawka #9 — stawka godzinowa):**
- **Zakończone fazy do ponownego dotknięcia:** **ŻADNA** — `trainer_rate` nie istnieje jeszcze w schemacie (F20 nierozpoczęta). Najtańsza z sześciu poprawek: czysto dokładający zakres jednej, jeszcze nieotwartej fazy; kolumna `rate_type` wchodzi z pierwszą migracją `trainer_rate`, bez osobnej migracji additive.
- **Nierozpoczęte fazy rosnące bez ryzyka retrofitu:** wyłącznie F20 (rośnie w miejscu).

---

### Wykonane prace

#### A. Schemat + migracja

| Plik | Zmiana |
|---|---|
| `src/lib/db/schema/trainer-rates.ts` | Nowa tabela `trainer_rate` z `organizationId`, `trainerId`, `groupTypeId` (nullable), `amount`, `effectiveFrom`, `rateType` (`flat_per_session`\|`hourly`); unique `NULLS NOT DISTINCT` na `(orgId, trainerId, groupTypeId, effectiveFrom)` — zapobiega duplikatom dla stawki bazowej (NULL groupTypeId) |
| `src/lib/db/schema/index.ts` | Eksport `trainer-rates` |
| `src/lib/db/migrations/0040_colossal_captain_universe.sql` | Ręcznie przycięta migracja — CREATE TABLE + FK + indeksy (bez ALTER TABLE z poprzednich faz) |
| `src/lib/db/migrations/0041_rls_trainer_rate.sql` | RLS wg wzorca `*_tenant_isolation`/`*_system_bypass` z `0015` |

#### B. RBAC

| Plik | Zmiana |
|---|---|
| `src/features/rbac/index.ts` | Dwa nowe uprawnienia: `trainer_rates.manage` (Owner/Admin), `trainer_earnings.view` (Owner/Admin/Trainer — własne dane egzekwowane backendowo) |

#### C. DAL

| Plik | Zmiana |
|---|---|
| `src/features/trainers/rate-data.ts` | CRUD stawek — `listRates`, `getRate`, `createRate` (INSERT-only, nigdy UPDATE), `deleteRate` |
| `src/features/trainers/earnings-data.ts` | Raport wynagrodzeń: kwalifikacja sesji (≥1 booking z `attendanceStatus != 'unmarked'`), Constraint 8 resolution (group-specific → base → "no rate" list), `calculateAmount` (flat_per_session = amount, hourly = FLOOR(amount × duration_hours)), scopedTrainerId enforcement dla roli Trainer |

#### D. Akcje

| Plik | Zmiana |
|---|---|
| `src/features/trainers/rate-actions.ts` | `createRateAction` (gated `trainer_rates.manage` + audit trail), `deleteRateAction` (jw.), `getEarningsReportAction` (gated `trainer_earnings.view`, Trainer = self-scope force) |

#### E. UI

| Plik | Zmiana |
|---|---|
| `src/features/trainers/components/rates-page-client.tsx` | Client component: tabela stawek (trainer, groupType, amount, effectiveFrom, rateType) + przycisk delete |
| `src/features/trainers/components/rate-form.tsx` | Client component: formularz tworzenia stawki (select trainer, amount, date, rateType, optional groupType) |
| `src/features/trainers/components/earnings-report-client.tsx` | Client component: filtr dat + trainer (ukryty dla roli Trainer), tabela wyników, sekcja "sesje bez stawki", suma |
| `src/app/[locale]/(app)/dashboard/trainers/rates/page.tsx` | Strona CRUD stawek — gated `trainer_rates.manage` |
| `src/app/[locale]/(app)/dashboard/trainers/earnings/page.tsx` | Strona raportu wynagrodzeń — gated `trainer_earnings.view`, self-scope dla roli Trainer |
| `src/app/[locale]/(app)/dashboard/academy-home.tsx` | Nav linki: "Rates" (gated `trainer_rates.manage`), "Earnings" (gated `trainer_earnings.view`) |

#### F. Audit trail

| Plik | Zmiana |
|---|---|
| `src/features/admin/audit.ts` | Nowe akcje: `trainer_rate.created`, `trainer_rate.deleted`; nowy targetType: `trainer_rate` |

#### G. i18n

| Plik | Zmiana |
|---|---|
| `src/lib/i18n/messages/pl.json` | Klucze dla dashboard.org (rates, earnings) + dashboard.trainers (rates*, earnings*, myEarnings) |
| `src/lib/i18n/messages/en.json` | Klucze EN — jw. |

#### H. E2E

| Plik | Zmiana |
|---|---|
| `e2e/langlion-trainer-earnings.spec.ts` | Test: admin tworzy stawkę bazową → widoczna w tabeli |

### Rozstrzygnięcia podjęte w trakcie F20

- **Zaokrąglenie hourly:** FLOOR (w dół) — `Math.floor(amount × duration_hours)`. Bezpieczne dla akademii.
- **Unique dla NULL groupTypeId:** `UNIQUE NULLS NOT DISTINCT` (Postgres 15+) — bez tego dwa rekordy stawki bazowej z tym samym `effectiveFrom` byłyby dozwolone, bo NULL ≠ NULL w domyślnym unique.
- **audit trail:** `trainer_rate.created` i `trainer_rate.deleted` dodane do `AUDIT_ACTIONS` i `AuditTargetType`.

---

