### Faza 11 — Płatność online za pojedyncze zajęcia (EPIK 5)

**Status:** zakończona (2026-07-24)
**Cel:** klient płaci online za pojedyncze zajęcia; miejsce potwierdza wyłącznie webhook.
**Pokrywa:** EPIK 5; §2.4 (source `online_payment`); US-4.4 (metoda online w formularzu); US-5.1/AC1–AC3.
**Zależności:** F5 (booking `payment_pending`), F10 (Connect — checkout na Connected Account).
**Zakres:** generowanie Checkout na Connected Account organizacji (bramka §2.25); webhook potwierdzenia → w jednej transakcji: kredyt `online_payment` utworzony + skonsumowany + `booking → confirmed` (US-5.1/AC1); redirect NIGDY nie potwierdza (AC2); kredyt atomowy niewidoczny w portfelu (AC3); idempotencja przez `webhook_event`.
**DoD:** e2e (offline, wzorzec jak `billing-webhook.spec.ts`): happy path online (AC1); AC3 — kredyt nie pojawia się jako available; podwójna dostawa webhooka nie duplikuje kredytu; payment_status=unpaid ignorowany; suita zielona.

### Decyzja architektoniczna — direct charge, nie destination
- `createConnectCheckoutSession` tworzy sesję przez `stripe.checkout.sessions.create(params, { stripeAccount: accountId })` (per-request Stripe account header)
- Bez `transfer_data` — destination charge byłoby niepoprawne dla Standard Connect (F10)
- `checkout.session.completed` przychodzi jako Connect event (pole `account = acct_...`) → trafia na Connect webhook (`/api/billing/connect/webhook`)
- Opcjonalnie: `application_fee_amount` dla prowizji platformy (decyzja biznesowa, nie blokuje F11)

### Implementacja

| Plik | Zmiana |
|------|--------|
| `src/lib/adapters/billing/contract.ts` | `ConnectCheckoutInput` type, `ConnectAccountEvent`/`ConnectPaymentEvent` discriminated union, `createConnectCheckoutSession` w `BillingAdapter` |
| `src/lib/adapters/billing/stripe.ts` | `checkout.session.completed` w `parseConnectEvent`, `createConnectCheckoutSession` (direct charge) |
| `src/lib/adapters/billing/none.ts` | NOOP `createConnectCheckoutSession` |
| `src/lib/adapters/billing/index.ts` | Eksport nowych typów |
| `src/features/billing/connect-checkout.ts` | NOWY — `startConnectCheckout` helper |
| `src/features/billing/connect-webhooks.ts` | `processConnectPaymentEvent` — atomowa transakcja: idempotencja → resolve → issue credit → spend credit → confirm booking |
| `src/app/api/billing/connect/webhook/route.ts` | Routing przez discriminated union event.type |
| `src/features/bookings/actions.ts` | `onlineAvailable` z `org.stripeConnectChargesEnabled`, checkout URL w stanie |
| `src/features/bookings/components/enrollment-flow.tsx` | `useEffect` redirect do Stripe po `state.checkoutUrl` |
| `src/app/[locale]/(site)/zapisy/[groupTypeSlug]/page.tsx` | `onlineAvailable` z `org.stripeConnectChargesEnabled` |
| `src/lib/i18n/messages/{pl,en}.json` | Klucz `done.redirecting` |
| `e2e/billing-fixtures.ts` | `connectCheckoutCompletedEvent` fixture |
| `e2e/billing-connect-checkout.spec.ts` | NOWY — 4 testy E2E |
