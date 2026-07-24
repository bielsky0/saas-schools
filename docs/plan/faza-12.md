### Faza 12 — Pakiety i subskrypcje (EPIK 9, 10, 23, 25)

**Status:** w trakcie — podfaza (c) zakończona, (d) następna
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

### Podfaza (d) — Subskrypcje na Connected Account

**Zależności:** (a) ✓, (c) ✓
**Zakres:** `stripeSubscriptionId` na Connected Account, `invoice.paid` → kredyty + auto-fill (idempotencja §12.3/US-9.2), `invoice.payment_failed` → `past_due` + e-mail z linkiem do Customer Portal, `customer.subscription.deleted` → `canceled`

---

### Podfaza (e) — Nieretroaktywność zmian polityki

**Zależności:** (d)
**Zakres:** US-23.5/23.6 + ostrzeżenie „package bez aktywnego template" (US-23.4)

---

**Wymóg z Rozstrzygnięcia #20 (dotyczy podfaz c i d):** ścieżka checkoutu pakietowego musi dopuszczać ad-hoc `price_data` jako alternatywę dla `product_template.stripe_price_id` **już od startu tej fazy**, nie dopiero w F21 — to jedyny sposób wyrażenia rabatu per klient zmiennego między cyklami (§2.31).

**DoD całej fazy:** e2e na AC EPIK 9/10/23/25 (w tym częściowy auto-fill z powiadomieniem e-mail, podwójny webhook odnowienia bez duplikatów); suita zielona.

---
