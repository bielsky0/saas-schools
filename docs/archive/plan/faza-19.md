### Faza 19 — Warunkowe UI formularza + fakturowanie ręczne

**Status:** ✅ zakończona (2026-07-25)
**Cel:** domknięcie ogona: formularz w pełni odzwierciedla politykę zakupową; administracyjny proces faktur.
**Pokrywa:** spec §5 pkt 18–19; EPIK 27; US-4.4/AC4, US-23.3.
**Zależności:** F12 (✅ wykonana).
**Zakres:** pełne warunkowe renderowanie formularza wg `allowed_purchase_modes`/`allowed_billing_types` (+ komunikat „brak dostępnych pakietów"); żądanie faktury przez klienta (`invoice_requested_at`), lista oczekujących dla recepcji, oznaczenie wystawienia (`invoice_issued_*`, uprawnienie `invoices.mark_issued`); nic z tego nie blokuje ścieżki zakupowej.
**DoD:** e2e na AC EPIK 27 i US-23.3; suita zielona (oczekuje na e2e).

---

### Wykonane prace

#### A. Warunkowe UI formularza

| Plik | Zmiana |
|---|---|
| `src/features/bookings/payment-options.ts` | Dodano `allowedBillingTypes` do `OfferPaymentInput`; nowe warianty `PaymentOptionsView`: `packages_available` (lista pakietów dla packages-only) i `mixed_mode` (dwie sekcje: single-class + pakiety); funkcja `paymentOptionsFor` filtruje pakiety przez `allowedBillingTypes` (US-23.3); `isBookable` akceptuje `mixed_mode`; `isMethodAcceptable` obsługuje `mixed_mode` |
| `src/features/bookings/payment-options.test.ts` | Nowe testy: billing type filtering, packages_available, mixed_mode, no_packages_available dla pustego filtra |
| `src/app/[locale]/(site)/zapisy/[groupTypeSlug]/page.tsx` | Fetchuje aktywne `product_template` zamiast tylko `hasActivePackages` bool; przekazuje `allowedBillingTypes` i `packages` do `paymentOptionsFor`; log `warn` gdy packages-only bez template'ów (martwa konfiguracja) |
| `src/features/bookings/components/enrollment-flow.tsx` | Nowy `PackageSection` — karty z pakietami (nazwa, cena, liczba kredytów, billing type, przycisk "Kup pakiet"); `mixed_mode` renderuje dwie osobne sekcje (pakiety + kalendarz); `packages_available` renderuje tylko pakiety |

#### B. Fakturowanie ręczne (EPIK 27)

| Plik | Zmiana |
|---|---|
| `src/lib/db/schema/credit-purchases.ts` | 4 nowe kolumny: `invoice_requested_at`, `invoice_issued_at`, `invoice_number`, `invoice_issued_by_user_id`; FK `credit_purchase_invoice_issued_by_fk` → `user.id` ON DELETE SET NULL |
| `src/lib/db/migrations/0039_faza19_invoice_fields.sql` | Ręczna migracja — ALTER TABLE + ADD CONSTRAINT |
| `src/features/rbac/index.ts` | Nowe uprawnienie `invoices.mark_issued`; nadane rolom: owner, admin, secretariat, reception |
| `src/features/billing/invoice-data.ts` | DAL: `listClientPurchases` (dla portfela klienta), `listPendingInvoices` (dla recepcji), `listIssuedInvoices` (historia) |
| `src/features/billing/invoice-actions.ts` | `requestInvoiceAction` (klient: autoryzacja przez `resolveClientSession` + sprawdzenie `clientId` — chroni przed cudzym ID), `markInvoiceIssuedAction` (staff: gated przez `invoices.mark_issued`) |
| `src/app/[locale]/(site)/moje-zajecia/page.tsx` | Nowa sekcja "Purchases" z przyciskiem "Poproś o fakturę" (widoczny tylko gdy `invoice_requested_at IS NULL`) |
| `src/features/billing/components/request-invoice-button.tsx` | Client component z `useActionState` dla `requestInvoiceAction` |
| `src/app/[locale]/(app)/dashboard/invoices/page.tsx` | Nowa strona gated przez `invoices.mark_issued`: lista oczekujących + lista wystawionych |
| `src/features/billing/components/invoice-pending-list.tsx` | Client component: karty oczekujących faktur z polem `invoiceNumber` i przyciskiem "Oznacz jako wystawioną" |

#### Pozostałe

- `src/lib/i18n/messages/en.json` + `pl.json` — klucze dla invoice + payment.packages/*

### Uwagi

- `requestInvoiceAction` zakłada `credit_purchase` = completed payment (nie ma kolumny `paymentStatus` — wiersz powstaje dopiero po potwierdzeniu płatności). Komentarz w kodzie ostrzega przed przyszłymi zmianami.
- `no_packages_available` obsługuje dwa przypadki: (a) brak aktywnych template'ów w ogóle, (b) filtr billing type wyzerował listę. Ten sam komunikat dla klienta; log `warn` po stronie serwera dla przypadku (a).
- Powiadomienia recepcji o nowej prośbie o fakturę nie są częścią tej fazy (świadomie odłożone).

---

