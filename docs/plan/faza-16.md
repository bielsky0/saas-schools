### Faza 16 — Zwroty fiducjarne (EPIK 18)

**Status:** ✅ zakończona (2026-07-25)
**Cel:** zwroty częściowe i pełne z cofnięciem, ze źródłem prawdy zależnym od metody płatności.
**Pokrywa:** EPIK 18; §2.9; spec §5 pkt 14.
**Zależności:** F12 (credit_purchase), F14 (powiadomienia `refund_confirmed`).

#### Zakres zrealizowany

| Obszar | Pliki | Opis |
|---|---|---|
| **Migracja DB** | `0033_faza16_refund_fields.sql` | Kolumny: `price_paid`, `stripe_payment_intent_id`, `refund_initiated_at`, `refund_variant`, `refunded_at`, `refund_amount`, `refund_confirmed_by_user_id` |
| **Schema** | `src/lib/db/schema/credit-purchases.ts` | Nowe kolumny + FK do `user` dla `refund_confirmed_by_user_id` |
| **Retrofit** | `purchases.ts`, `connect-webhooks.ts` | `pricePaid` wypełniane przy tworzeniu `credit_purchase` (cash z `productTemplate.price`, online z `event.amount`) |
| **Adapter billingowy** | `contract.ts`, `stripe.ts`, `none.ts` | Typ `ConnectRefundEvent`, event type `charge.refunded` w `parseConnectEvent`, metody `createConnectRefund` + `resolveConnectPaymentIntentId` |
| **Webhook handler** | `connect-webhooks.ts` | `processConnectRefundEvent` — idempotentne przetwarzanie `charge.refunded`, matchowanie po `stripe_payment_intent_id`, notyfikacje |
| **Route** | `route.ts` | Dispatch dla `charge.refunded` → `processConnectRefundEvent` |
| **Cancel for refund** | `refund-cancel.ts` | Dedykowana ścieżka: atomowe `used → pending_refund → refunded` + cancel booking + cascade GCR. **Nie** używa `cancelBooking()` — unika podwójnej kompensacji. |
| **Server actions** | `refund-actions.ts` | `refundInitiateAction`: atomowa inicjacja z formułą `floor((unused/purchased)×price_paid)`, warstwowa obsługa błędów (transakcja → Stripe API → rollback) |
| **Cron recovery** | `refund-recover.ts`, `contract.ts`, `registry.ts`, `route.ts` | Dwuwarstwowa: (A) samo-naprawa przy interakcji, (B) cron `refunds.recover` (co godzinę, cutoff 30 min) z idempotentnym retry Stripe API |
| **RBAC** | `rbac/index.ts` | Uprawnienie `refunds.issue` przyznane `owner`, `admin`, `secretariat` |
| **Audit** | `admin/audit.ts` | Akcje: `booking.cancel_for_refund`, `credit.refund_initiate`, `credit.refund_confirmed`, `credit.refund_webhook`, `credit.refund_failed`, `credit.refund_recovery_failed` |
| **Notyfikacje** | `emit.ts`, `contract.ts`, `categories.ts`, template, i18n | Template email `refund-confirmed`, kategoria transactional, i18n PL+EN |
| **Deadlock prevention** | `cancel-session.ts`, `refund-cancel.ts` | Konwencja ORDER BY `booking.id` w obu ścieżkach lockujących booking + GCR |

#### Kluczowe decyzje projektowe

1. **Dedykowana ścieżka cancel-for-refund** — nie używa `cancelBooking()` (unika podwójnej rekompensaty: pieniądze + kredyt, zamyka race condition).
2. **Jednolity ślad kredytu** — `used → pending_refund → refunded` (nie `used → refunded` bezpośrednio).
3. **Cascade group_change_request** — booking z otwartym requestem → `cancelled_by_admin` z `cancellationReason = "purchase refunded"`.
4. **Locking convention** — ORDER BY `booking.id` we wszystkich ścieżkach lockujących booking + groupChangeRequest.
5. **Dwuwarstwowe recovery** — (A) samo-naprawa przy interakcji admina, (B) cron `refunds.recover` z Stripe idempotency key.
6. **Webhook jako źródło prawdy** — cron recovery nie ustawia `refunded_at`, zostawia to `charge.refunded` webhookowi.

---

