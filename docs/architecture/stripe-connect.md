# Stripe Connect per tenant (mvp-plan Faza 5)

> Status: **zrealizowane** (2026-09-05). Płatności per-tenant przez Stripe
> Connect, testy E2E + monitoring ponownych prób webhooków.

## Decyzje architektoniczne

1. **Jeden endpoint Connect, HMAC zamiast sesji.** `/api/billing/connect/webhook`
   jest celowo UNAUTHENTICATED — podpis to autoryzacja (`STRIPE_CONNECT_WEBHOOK_SECRET`,
   inny niż sekret webhooka platformy). Odpowiedzi: `400` zły podpis/surowe dane,
   `404` brak providera (`BILLING_PROVIDER=none`), `200` dla accepted/duplicate/
   ignored/unknown, `5xx` błąd infrastruktury. Stripe ponawia `5xx` samodzielnie.

2. **Dispatcher zamiast switch-in-route.** `processConnectWebhookEvent(event)`
   (`src/features/billing/connect-webhooks.ts`) jest JEDYNYM wejściem do obsługi
   zdarzeń — wołają go i route, i job `webhooks.monitor-stuck` (replay = ta sama
   ścieżka co oryginalne dostarczenie, zero osobnej gałęzi do dryfu). Dyspozytor
   rozjeżdża po dyskryminującej unii `ConnectEvent` (`.type`): checkout → payment,
   invoice.*/subscription.deleted → subscription, charge.refunded → refund,
   reszta → account.

3. **Marker idempotencji = `webhook_event`.** Każdy processor zapisuje wiersz
   `(provider, providerEventId)` z `ON CONFLICT DO NOTHING` w JEDNEJ transakcji
   z biznesowym zapisem. Dlatego: podwójne dostarczenie → `duplicate`, a transakcja,
   która rzuciła, cofa i marker (Stripe może ponowić czysto). Tabela ma od 0017
   FORCE RLS (izolacja org/account + system bypass) — XLL kontrakt osiągnięty przez
   `withSystemBypass` w processorach (owner = wynik lookupu, nie wejście).

4. **Monitoring poprawek (F5.3) to rekord obok markera, NIE drugi stan biznesowy.**
   Migracja `0082` dodała do `webhook_event`: `status` (`processed|failed|dead`),
   `attemptCount`, `lastError`, `lastAttemptAt`, `payload` (JSONB neutralnego
   `ConnectEvent`). Route, łapiąc wyjątek przetwarzania, woła `recordWebhookFailure()`
   (best-effort — jeśli padł sam DB, route i tak odpowiada `500`). KONIEC luki
   „przetwarzanie zepsute, ale nikt o tym nie wie".

5. **Dlaczego `failed` nie blokuje replayu (sedno projektu).** Unikalny
   `(provider, providerEventId)` znaczy, że lewy `failed` odczyta processor jako
   `duplicate` i NIE zrobi roboty. Monitor więc **przed replayem USUWA** `failed`
   — udany replay wstawia świeży `processed` w swoim txn, nieudany jest
   re-rekordowany przez tę samą ścieżkę co route. Delikatny moment: po usunięciu
   licznik `attemptCount` musi wrócić DO WSTAWKI (`options.attemptCount`), inaczej
   nieudany replay zeruje liczbę prób do 1.

6. **Sweep `webhooks.monitor-stuck` (hourly, cron-drain).** Dla każdego `failed`
   bezczynnego ≥ 10 min: usuń marker → replay przez `processConnectWebhookEvent`.
   Ciężarowe ponowne próby: route próbuje `attemptCount+1`; monitor dokłada 1 próbę
   na sweep; po `WEBHOOK_MAX_ATTEMPTS=3` → `dead` + alert. Dead-letter `emitDomainNotification`
   (`webhook-dead-lettered`, seed migracja `0083`, `is_overridable=false`, email+in_app)
   do WSZYSTKICH aktywnych ownerów przez `resolveBillingRecipients`; dedupeBasis =
   `providerEventId` → alert exactly-once nawet przy re-claimie. `dead` zostaje
   w ledgermie (paneli zdrowia go widzi), ale filtr `status='failed'` wyklucza go
   z kolejnych sweepów.

7. **Ledger widoczny dla właściciela: `WebhookHealthPanel`.** Na stronie billing
   (`billing.manage`, Owner-only) pod ConnectPanel: zliczenia `processed/failed/dead`
   + 10 ostatnich zdarzeń (status-badge, licznik prób, ostatni błąd, ostatnia próba).
   Czytane przez `withTenant(org.id)` — ten sam kontrakt izolacji co cały data-layer;
   panel pojawia się tylko gdy org ma `stripeConnectAccountId`.

8. **Tryb testowy.** `STRIPE_TEST_MODE=true` wymusza tryb testowy (override
   `sk_test_`/`sk_live_`); ikona + baner na stronie billing. W deploymencie bez
   Stripe (`BILLING_PROVIDER=none`) webhook odpowiada `404` — analogicznie do
   braku `CRON_SECRET`.

## Kluczowe pliki

- `src/app/api/billing/connect/webhook/route.ts` — endpoint + failure recording
- `src/features/billing/connect-webhooks.ts` — dispatcher `processConnectWebhookEvent`
- `src/features/billing/webhook-monitoring.ts` — `recordWebhookFailure`, handler
  `webhooks.monitor-stuck`, dead-letter + alert
- `src/features/billing/components/connect-panel.tsx` — panel statusu Connect
- `src/features/billing/components/webhook-health-panel.tsx` — ledger webhooków
- `src/features/billing/test-mode.ts` — `isStripeTestMode()`
- `src/lib/db/migrations/0082_webhook_retry_monitoring.sql` — kolumny monitoringu
- `src/lib/db/migrations/0083_webhook_dead_lettered_notification.sql` — event type
- `scripts/test-connect.ts` — E2E (7 scenariuszy; wymaga env + działającego serwera)

## Środowisko (E2E)

```
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_e2eDummyConnectSecretForLocalHmac
STRIPE_TEST_MODE=true
# + normalne klucze Stripe / zmienne billingowe (inaczej BILLING_PROVIDER=none → webhook 404)
```

Uwaga (bug administracyjny F5.3): ręczne migracje `0081`/`0082` zawierały
`--> statement-breakpoint` W ŚRODKU `ALTER TABLE` (przecinek po `ADD COLUMN ...`),
co dzieliło jedną instrukcję na nielegalne segmenty (`ALTER TABLE "organization"`
→ `syntax error at end of input`). Obie przepisane tak, by breakpoint kończył
KOMPLETNĄ instrukcję; `0082` wgrane, wiersz śledzenia dla `0081` (który był wgrywany
ręcznie) uzupełniony. Hash plików = wartość z `drizzle.__drizzle_migrations`.