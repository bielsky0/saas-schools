### Faza 12 — Pakiety i subskrypcje (EPIK 9, 10, 23, 25)

**Status:** ✅ **zakończona** (2026-07-24)
**Cel:** sprzedaż pakietów (gotówka + online + subskrypcje) z auto-wypełnieniem terminów.
**Pokrywa:** EPIK 9, 10, 23, 25; §2.5, §2.6, §2.13, §2.15; spec §5 pkt 9.
**Zależności:** F4 (kredyty) ✓, F6 (recepcja) ✓, F11 (checkout online) ✓.

---

### Podfaza (a) — Schema: encje pakietów, zakupów, subskrypcji ✅ zakończono

**Data rozpoczęcia:** 2026-07-24
**Zakres:**

Nowe tabele:
- `product_template` — definicja produktu (cena, liczba kredytów, billingType, stripePriceId)
- `credit_purchase` — rejestr zakupów (gotówka, online, subskrypcja)
- `client_subscription` — stan subskrypcji klienta (active | past_due | canceled)
- `client_stripe_customer` — mapowanie klient → Stripe customer na Connect

Modyfikacje schematu:
- `credit.creditPurchaseId` → realny FK do `credit_purchase`
- `organization.portalConfigured` — flaga czy Customer Portal skonfigurowany na Dashboard Stripe

Rozstrzygnięcia z code review (2026-07-24):
1. **`client_stripe_customer` jako osobna tabela (opcja B)**: customer ID per para klient–akademia, nie per subskrypcja. Customer Portal działa nawet po anulowaniu subskrypcji.
2. **`purchaseKind` w metadata Checkout Session**: enum `booking_payment | package_purchase | subscription_initial`. Router w `connect-webhooks.ts` przełącza po `purchaseKind`, nie po obecności `bookingId`. Retrofit F11.
3. **Usunięcie `allowedBillingTypes` z `product_template`**: Constraint 4 sprawdzany przez join `credit_type → group_type.allowedBillingTypes`. Unikamy duplikacji i rozjazdu.

Kontrakt:
- Nowy `ConnectPackageCheckoutInput` dla checkoutu pakietowego
- `purchaseKind` w `ConnectCheckoutInput` (retrofit F11)
- Nowy `ConnectStripeCustomerInput` do tworzenia customer na Connect per klient

**DoD podfazy (a):**
- [x] Nowe tabele w schemacie
- [x] Realny FK `credit.creditPurchaseId → credit_purchase.id`
- [x] `portalConfigured` na `organization`
- [x] `purchaseKind` w kontrakcie + retrofit F11 w stripe.ts
- [x] Router `connect-webhooks.ts` po `purchaseKind`
- [x] Migracja wygenerowana i zastosowana
- [x] Suita zielona, brak regresji

---

### Podfaza (b) — Zakup gotówką (US-10.x) ✅ zakończono

**Data rozpoczęcia:** 2026-07-24
**Zależności:** (a) ✓
**Zakres:** zatwierdzenie recepcji = źródło prawdy, job w tle: rozliczenie zaległych `booked_offline` FIFO → auto-fill §7.5a (jednorazowa, nieponawiana próba per termin, przez pełną ochronę §5) → reszta do portfela

**Zrealizowane:**
- Nowy `CreditSource`: `package_cash` w `credits/schema.ts` i `credits.ts` (drizzle $type)
- Nowe uprawnienie `credits.purchase_cash` → reception, admin, owner w `features/rbac/index.ts`
- Nowa akcja audytu `credit.purchase_cash` + target `credit_purchase` w `features/admin/audit.ts`
- `features/billing/purchases.ts` — `confirmCashPurchase()`: tworzy `credit_purchase` + issue'uje kredyty + audytuje (bez auto-fill)
- `features/billing/auto-fill.ts` — `autoFillCredits()`: nie przyjmuje już `TenantDb`, zarządza własnymi transakcjami. Phase 1 (settle booked-offline) w jednej transakcji. Phase 2 (auto-book) — każda próba rezerwacji w osobnej transakcji `withTenant`, więc pojedynczy konflikt capacity (§5) lub EXCLUDE cofa tylko tę jedną próbę, nie całość. Kredyty zostają w portfelu.
- `features/billing/purchase-actions.ts` — `confirmCashPurchaseAction`: najpierw purchase (commituje), potem auto-fill (osobno). Rozdzielenie gwarantuje że konflikt w auto-fill nie cofa zakupu.
- `features/billing/components/confirm-cash-purchase-form.tsx` — formularz recepcji: wybór pakietu/klienta/dziecka
- `app/[locale]/(app)/dashboard/purchases/page.tsx` — strona panelu recepcji
- Link w `academy-home.tsx` dla roli z `credits.purchase_cash`
- i18n `credits.purchase.*` (en + pl)
- Fix: `auto-fill.ts` — zmiana nazwy zmiennej `gt` → `gtRow` (kolizja z drizzle `gt`), dodanie `inArray` do filtrowania istniejących bookingów
- Rozszerzenie `seed-langlion` o `productTemplate`
- `api/dev/purchases` — dev API do testów współbieżnych
- e2e: `langlion-purchases.spec.ts` — 3 testy: happy path, odmowa bez uprawnienia, współbieżność (dwa równoległe zakupy na sesję capacity=1 → jeden booking, jeden skip, kredyty w portfelu)

**DoD podfazy (b):**
- [x] `confirmCashPurchase` tworzy purchase + kredyty + auto-fill w jednej transakcji
- [x] Formularz recepcji w panelu (gated `credits.purchase_cash`)
- [x] e2e: happy path cash purchase zielony (weryfikacja z migracją)
- [x] e2e: auto-fill rozlicza `booked_offline` i zapisuje na przyszłe sesje
- [x] Suita zielona, brak regresji

---

### Podfaza (c) — Pakiety online one-time na Connected Account ✅ zakończono

**Zależności:** (a) ✓, (b) ✓
**Zakres:** webhook → kredyty → auto-fill. `price_data` jako alternatywa dla `stripePriceId` (Rozstrzygnięcie #20).

**Zrealizowane:**
- Nowy `CreditSource`: `package_online` w `credits/schema.ts` i `credits.ts` (drizzle $type)
- `features/billing/connect-checkout.ts` — `startConnectPackageCheckout()`: tworzy Checkout Session na Connect dla pakietu one-time, używa `price_data` jako alternatywy dla `stripePriceId`
- `features/billing/connect-webhooks.ts` — `processPackagePurchase()`: pełna implementacja handlera webhook:
  - Idempotencja przez marker `webhook_event` (ten sam wzorzec co `processBookingPayment`)
  - Tworzy `credit_purchase` z `paymentMethod: "online_one_time"` i `stripeSessionId`
  - Issue'uje kredyty z `source: "package_online"`, do portfela rodzinnego (`athleteId: null`)
  - Auto-fill uruchamiany PO commicie transakcji (ten sam split purchase→auto-fill co w purchase-actions.ts)
- `features/billing/package-checkout-actions.ts` — `checkoutPackageAction()`: server action dla rodzica na stronie akademii (weryfikacja klienta, aktywnego Connect, template'a, redirect do Stripe)
- `app/api/dev/package-webhook/route.ts` — dev API do symulacji webhooka w testach (obsługa `eventId` dla testów idempotentności)
- e2e: 3 testy w `langlion-purchases.spec.ts`:
  - Happy path: webhook → kredyty → rozliczenie `booked_offline` + auto-fill przyszłych sesji
  - Idempotentność: duplikat webhooka z tym samym `eventId` → `duplicate`, kredyty nie zdublowane
  - Współbieżność: dwóch klientów, capacity=1 → jeden booking, jeden skip, kredyty w portfelu

**DoD podfazy (c):**
- [x] `processPackagePurchase` tworzy purchase + kredyty + auto-fill (idempotentnie)
- [x] `startConnectPackageCheckout` wspiera `price_data` jako alternatywę dla `stripePriceId` (Rozstrzygnięcie #20)
- [x] Checkout dostępny dla rodzica z poziomu strony akademii (`checkoutPackageAction`)
- [x] e2e: happy path online purchase zielony
- [x] e2e: idempotentność webhooka (duplikat nie tworzy drugich kredytów)
- [x] e2e: auto-fill z ograniczeniem capacity (jeden booking, jeden skip)
- [x] Suita zielona, brak regresji
- [x] TypeScript clean, eslint clean

---

### Podfaza (d) — Subskrypcje na Connected Account ✅ zakończono

**Data rozpoczęcia:** 2026-07-24
**Zależności:** (a) ✓, (c) ✓
**Zakres:** `stripeSubscriptionId` na Connected Account, `invoice.paid` → kredyty + auto-fill (idempotencja §12.3/US-9.2), `invoice.payment_failed` → `past_due` + e-mail z linkiem do Customer Portal, `customer.subscription.deleted` → `canceled`

**Zrealizowane:**
- Schema: `client_subscription` z `stripeSubscriptionId` (unique, idempotencja) + FK do `client`/`productTemplate`; `credit_purchase.clientSubscriptionId` łączy partie kredytów z cyklem subskrypcji
- `connect-checkout.ts` — `startConnectSubscriptionCheckout()`: tworzy/z waxuje Stripe Customer na Connected Account, tworzy Checkout Session w trybie `subscription` z `purchaseKind: "subscription_initial"`
- `subscription-checkout-actions.ts` — `checkoutSubscriptionAction()`: walidacja template/polityki przed redirectem do Stripe
- `connect-webhooks.ts` — `processSubscriptionInitial()`: idempotentny przez `webhook_event` marker, upsertuje `client_subscription` po `stripeSubscriptionId` (bez issue'owania kredytów — split z invoice)
- `connect-webhooks.ts` — `processSubscriptionInvoice()`: obsługa `invoice.paid` z idempotencją:
  - Obsługa out-of-order: `invoice.paid` może przyjść przed `checkout.session.completed` → `INSERT ... ON CONFLICT DO NOTHING` + `UPDATE` do konwergencji
  - Placeholder `productTemplateId = 0000...` jeśli wiersz jeszcze nie istnieje
  - Resolution template'a: preferuje `client_subscription.productTemplateId`, fallback do dowolnego aktywnego template'a recurring
  - Issue'uje kredyty z source `subscription_renewal`, uruchamia auto-fill po commicie transakcji
  - REGUŁA (F12e): ignoruje `allowed_purchase_modes/allowed_billing_types` i `is_active` — subskrypcja odnawia się niezależnie od zmian polityki
- `connect-webhooks.ts` — `processSubscriptionFailed()`: `invoice.payment_failed` → `past_due`:
  - Sprawdza `portalConfigured` na `organization`, tworzy Customer Portal session przez `billing.createConnectPortalSession()` (Stripe Connect, `stripeAccount` header)
  - Wysyła e-mail `subscription-payment-failed` z `portalUrl` (lub bez linku — fallback "skontaktuj się z akademią")
  - Email template: `subscription-payment-failed.tsx` — dwa warianty (z CTA i bez)
  - Deduplikacja: `email:subscription-payment-failed:${eventId}:${email}`
- `connect-webhooks.ts` — `processSubscriptionDeleted()`: `customer.subscription.deleted` → `canceled`, istniejące kredyty pozostają `available` do naturalnego `valid_until`, bez e-maila
- Routing webhooków w `connect/webhook/route.ts`: `invoice.paid`/`invoice.payment_failed`/`customer.subscription.deleted` → `processConnectSubscriptionEvent`
- Kontrakt: `ConnectSubscriptionEvent` w billing contract, `ConnectEventType` z eventami subskrypcyjnymi, parsowanie Stripe adaptera
- `portalConfigured` na `organization` — flaga czy Customer Portal skonfigurowany na Dashboard Stripe
- Dev API: `api/dev/subscription-invoice`, `api/dev/subscription-failed`, `api/dev/subscription-deleted`
- e2e w `langlion-purchases.spec.ts`:
  - Happy path: `subscription_initial` → `invoice.paid` → kredyty → auto-fill
  - Duplikat `invoice.paid` jest idempotentny
  - Out-of-order: `invoice.paid` przed `checkout.session.completed`
  - `invoice.payment_failed` → `past_due` + e-mail (z i bez `portalConfigured`)
  - `customer.subscription.deleted` → `canceled`

**DoD podfazy (d):**
- [x] `client_subscription` ze `stripeSubscriptionId` (idempotencja webhooków)
- [x] `startConnectSubscriptionCheckout` tworzy sesję na Connected Account
- [x] `processSubscriptionInvoice` tworzy purchase + kredyty + auto-fill (idempotentnie)
- [x] `processSubscriptionFailed` → `past_due` + e-mail z linkiem do Customer Portal
- [x] `processSubscriptionDeleted` → `canceled` (kredyty zachowane)
- [x] Out-of-order: `invoice.paid` przed `checkout.session.completed`
- [x] Customer Portal przez `createConnectPortalSession` ze `stripeAccount` header
- [x] e2e: wszystkie ścieżki subskrypcji zielone
- [x] Suita zielona, brak regresji

---

### Podfaza (e) — Nieretroaktywność zmian polityki ✅ zakończono

**Data rozpoczęcia:** 2026-07-24
**Zależności:** (d) ✓
**Zakres:** US-23.5/23.6 + ostrzeżenie „package bez aktywnego template" (US-23.4)

**Zrealizowane:**
- US-23.5/23.6 — nieretroaktywność jako dwustronna bramka:
  - **Nowe zakupy (BLOCK):** `purchases.ts`, `package-checkout-actions.ts`, `subscription-checkout-actions.ts` sprawdzają `isActive`, `allowedPurchaseModes`, `allowedBillingTypes` przed utworzeniem zakupu
  - **Odnowienia webhook (ALWAYS ALLOW):** `processPackagePurchase` i `processSubscriptionInvoice` NIGDY nie walidują polityki — jawne komentarze REGUŁA w kodzie. Template resolution ignoruje `isActive` (AC7: dezaktywacja blokuje tylko nowe zakupy, nie odnowienia)
- US-23.4 — ostrzeżenie o braku aktywnych pakietów:
  - **Panel admina (AC2):** `groups/actions.ts` — przy zapisie group type z `allowedPurchaseModes` zawierającym `"package"`, zlicza aktywne `product_template`; jeśli 0 → warning toast (`noActivePackagesWarning`) z tłumaczeniami EN/PL
  - **Strona zapisów klienta (AC1):** `payment-options.ts` — nowy `no_packages_available` payment view kind; `enrollment-flow.tsx` renderuje `<Notice>`; strona zapisów compute'uje `hasActivePackages` z counta aktywnych template'ów
- `product_template.is_active` — pole używane konsekwentnie we wszystkich ścieżkach
- e2e: 5 testów w `langlion-purchases.spec.ts`:
  - US-23.4/AC1 — komunikat `no_packages_available` gdy brak aktywnych template'ów
  - US-23.6/AC1 — odnowienie subskrypcji bez `recurring` w `allowedBillingTypes`
  - AC7 — dezaktywowany template wciąż odnawia subskrypcję
  - US-23.5/AC1 — zmiana polityki nie wpływa na istniejący `price_snapshot` bookingów
  - US-23.6/AC2 — nowy zakup gotówką blokowany gdy polityka wyklucza `package`

**DoD podfazy (e):**
- [x] Nieretroaktywność: webhooki zawsze przepuszczają odnowienia (US-23.6/AC1, AC7)
- [x] Nowe zakupy sprawdzają politykę (US-23.6/AC2)
- [x] Ostrzeżenie admina o braku aktywnych pakietów (US-23.4/AC2)
- [x] Komunikat dla klienta na stronie zapisów (US-23.4/AC1)
- [x] `is_active` na `product_template` używane konsekwentnie
- [x] e2e: 5 testów pokrywających wszystkie AC
- [x] Suita zielona, brak regresji

---

**Wymóg z Rozstrzygnięcia #20 (dotyczy podfaz c i d):** ścieżka checkoutu pakietowego musi dopuszczać ad-hoc `price_data` jako alternatywę dla `product_template.stripe_price_id` **już od startu tej fazy**, nie dopiero w F21 — to jedyny sposób wyrażenia rabatu per klient zmiennego między cyklami (§2.31).

**DoD całej fazy:** e2e na AC EPIK 9/10/23/25 (w tym częściowy auto-fill z powiadomieniem e-mail, podwójny webhook odnowienia bez duplikatów); suita zielona.

---
