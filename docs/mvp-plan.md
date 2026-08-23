# Plan przed-MVP — strony systemowe, sekcje, zapisy, AI, dashboard UX, płatności

> Status: **plan zatwierdzony** (2026-08-23). Każda faza = osobna sesja.
> Wpisuj postęp/odchyłki przy każdej fazie, wzorem `docs/blog-templates-cms/README.md`.

## 0. Podział odpowiedzialności (architektura)

| Obszar | Gdzie | Narzędzie |
|--------|-------|-----------|
| **Konfiguracja biznesowa** (group types, grupy, harmonogramy, ceny, trenerzy, polityki) | Dashboard | React forms + **Schedule Builder** (kalendarz klikalny) |
| **Strony marketingowe / publiczne** (Home, 404, Listing zapisów, Szablon szczegółów zapisu, Blog, O nas) | ChaiBuilder Editor | Bloki, sekcje, AI, template system |

Utrwalone decyzje:

- **Schedule Builder** to poprawa UX dashboardu, działa na **wszystkie typy silników**
  (`schedule_first`, `availability_first`, `slot_first`). **Nie** jest budowany w edytorze.
- Typy zajęć, grupy itp. tworzy się w dashboardzie (w kalendarzu zaznaczając itp.).
- **Strony zapisów działają jak blogi**: są szablony + elementy/bloki dostępne tylko dla zapisów,
  edytowane w ChaiBuilder.
- **AI provider ustawiony na sztywno w kodzie** — klient nie zmienia modelu.
- **Strona 404** — normalnie edytowalna, ale są gotowe sekcje do niej.
- **Listing zapisów** — edytowalny w edytorze, z gotowymi sekcjami.
- **Predefiniowane sekcje mają preview jako PNG** (jak w oryginalnym ChaiLibrary — to działało dobrze).

## 1. Graficzny plan faz

```
Faza 1 ─── System pages + widoczność w topbarze
   │
Faza 2 ─── Kolekcja Enrollments (model Shopify: produkt = GroupType, kolekcja = listing)
   │
Faza 3 ─── Biblioteka sekcji per nisza (PNG preview) + AI w edytorze
   │
Faza 4 ─── Dashboard UX: Schedule Builder + Kreator Group Type
   │
Faza 5 ─── Stripe Connect — E2E testy + polish
   │
Faza 6 ─── Initial data / onboarding (wybór niszy → seedowanie)
```

Zależności: F2 zależy od F1 (system pages/PageSelector). F3 zależy od F1 + F2 (bloki zapisów).
F6 zależy od F1, F2, F3 (seed stron, sekcji, motywu). F4 i F5 są niezależne.

## 2. Faza 1 — Strony systemowe + topbar

**Cel:** wbudowane strony (404, zapisy itp.) edytowalne w ChaiBuilder, widoczne od razu w topbarze.

- Nowe `pageType` systemowe w `src/lib/db/schema/pages.ts`:
  - `system_404`
  - `system_signup`
  - `system_enrollment_listing`
  - `system_enrollment_detail`
- Seed domyślnych stron w `createOrganizationAction` (`src/features/organizations/actions.ts`,
  obecnie seeduje tylko `cms_collection`): Home, 404, Listing zapisów, Szablon szczegółów zapisu.
- Rozszerzyć `PageSelector` w SDK
  (`packages/chaibuilder-sdk/src/pages/client/components/page-selector-in-header.tsx`)
  o sekcję „Strony systemowe" — zawsze widoczne w topbarze.
- Publiczny renderer (`src/app/(public)/cms-page/[[...slug]]/page.tsx`) obsługuje generycznie
  dowolny `pageType` — upewnić się, że `system_404` renderuje się dla nieznanych tras
  (`not-found.tsx` / middleware).

Kluczowe pliki:
- `src/lib/db/schema/pages.ts` — nowe pageType
- `src/features/organizations/actions.ts` — seed stron na utworzenie org
- `packages/chaibuilder-sdk/src/pages/client/components/page-selector-in-header.tsx` — sekcja systemowa
- `src/app/[locale]/not-found.tsx` (create) — render `system_404` przez ChaiBuilder

## 3. Faza 2 — Kolekcja Enrollments (jak blogi)

**Cel:** strona zapisów edytowana w ChaiBuilder (nie sztywno generowana). Shopify:
produkty = zapisy (GroupType), kolekcje = listing zapisów.

- `DEFAULT_CMS_COLLECTIONS` (`src/lib/db/schema/cms-collections.ts`) + `"enrollments"`
  (pageType: `enrollment_detail`, templatePageType: `enrollment_template`).
- **Bloki dedykowane zapisom** (tylko w tej kolekcji dostępne), w `src/blocks/Enrollment*/`:
  - `EnrollmentHero` — nazwa, opis, cena, CTA
  - `EnrollmentSchedule` — kalendarz/siatka (logika z `UpcomingEvents`)
  - `EnrollmentPricing` — pakiety, subskrypcje
  - `EnrollmentInstructors` — karty trenerów
  - `EnrollmentPolicy` — zgody/polityki
  - `EnrollmentBookingButton` — link do checkoutu
- Rejestracja w `src/blocks/index.ts` + `src/lib/section-catalog.ts`.
- **Data binding:** bloki czytają `externalData: { groupType, packages, availability, trainers }`
  przekazane przez publiczny renderer (wzorzec bloga F5.5 — `usePageExternalData` w SDK).
- **Publiczna trasa** `/zapisy/[[...slug]]` → resolver CMS (zastępuje obecny sztywny
  `src/app/[locale]/(site)/zapisy/[groupTypeSlug]/page.tsx`).
- Dashboard: właściciel edytuje `enrollment_listing` (siatka kart) i `enrollment_template`
  (layout szczegółów) w ChaiBuilder.

Kluczowe pliki:
- `src/lib/db/schema/cms-collections.ts` — nowa kolekcja `enrollments`
- `src/blocks/Enrollment*/` (new) — bloki + configs
- `src/lib/blocks-library.ts` / `src/lib/blocks-library/` — szablony stron zapisów
- `src/app/[locale]/(site)/zapisy/[[...slug]]/page.tsx` (replace) — renderer CMS
- `src/app/(builder)/editor/api/route.ts` — data binding dla `enrollment_detail`

## 4. Faza 3 — Biblioteka sekcji per nisza + AI

**Cel:** predefiniowane sekcje zamiast wymuszania dodawania bloków; AI do zmian w edytorze.

### 4.1 Biblioteka sekcji z PNG preview

- SDK wspiera `thumbnail` w `SectionCatalogEntry` (`src/types/section-catalog.ts`):
  `"auto"` = render z default props; **URL** = bezpośredni obrazek.
- Stworzyć `public/section-previews/{niche}/*.png` — screenshoty sekcji.
- `src/lib/blocks-library/{swimming,school,dance,general}-sections.ts`:
  - `swimming` — hero z basenem, siatka harmonogramu, karty trenerów, tabela cen
  - `school` — siatka programu, profile nauczycieli, karuzela opinii, formularz kontaktowy
  - `dance` — galeria, harmonogram, progresja poziomów, CTA zapisu
- `langlionLibrary` → rejestr scalający wszystkie nisze.
- `src/lib/section-catalog.ts` — kategorie: `hero`, `grid`, `cards`, `forms`, `pricing`,
  `testimonials`; każdy wpis ma `thumbnail: "/section-previews/...png"`.
- Sekcje do 404 i listingu — gotowe warianty.

### 4.2 AI w edytorze

- Przycisk `AiAssistant` w topbarze (SDK) już istnieje — wymaga `askAiCallBack` + `flags.ai`.
  Edytor (`src/app/(builder)/editor/editor.tsx`) już przekazuje `flags.ai: true`.
- Zaimplementować `askAiCallBack` → wewnętrzny endpoint `/api/ai/assist` z **modelem na
  sztywno** (np. `gpt-4o-mini`). Klient nie wybiera modelu.
- Kontekst dla AI: aktualne bloki strony, dostępna biblioteka sekcji, nisza organizacji.
- Streaming odpowiedź → wstawianie/modyfikacja bloków przez `editorAPI` ChaiBuildera.
- Fallback: brak klucza API → „Skonfiguruj AI".

## 5. Faza 4 — Dashboard UX: Schedule Builder + Kreator Group Type

**Cel:** sprawne generowanie grup i zajęć — zaznaczanie w kalendarzu itp.

### 5.1 Schedule Builder

- Client component: siatka **Pon–Ndz × godziny**.
- Klik = dodaj sesję/grupę, drag = przesuń, resize = zmień długość.
- Działa dla **wszystkich** silników (`schedule_first`, `availability_first`, `slot_first`).
- **W dashboardzie, nie w edytorze** — zapis bezpośrednio do `groupTypeRecurrence` /
  `classSession` (commit przy „Zapisz group type").

### 5.2 Kreator Group Type (wizard)

- Krok 1: Podstawy (nazwa, slug, opis, nisza)
- Krok 2: **Schedule Builder** (harmonogram)
- Krok 3: Cennik (pakiety, subskrypcje, ceny)
- Krok 4: Polityki (zgody, dokumenty, wymagania)
- Krok 5: Publikacja + link do edycji szablonu strony zapisu w ChaiBuilder
- Lista group types: akcje masowe, duplikuj, podgląd strony zapisu.

Kluczowe pliki:
- `src/app/[locale]/(app)/dashboard/group-types/page.tsx`
- `src/app/[locale]/(app)/dashboard/group-types/[groupTypeId]/page.tsx`
- `src/features/groups/components/group-type-form.tsx` — rozbić na kroki
- `src/features/groups/components/schedule-builder.tsx` (new)

## 6. Faza 5 — Stripe Connect per tenant: testy + polish

**Cel:** podłączyć płatności per tenant i przetestować jak działa.

- Skrypt E2E `scripts/test-connect.ts` pokrywający:
  1. Onboarding Connect (account link)
  2. Płatność za pojedyncze zajęcia (`booking_payment`)
  3. Zakup pakietu (`package_purchase`)
  4. Subskrypcja + odnowienie (`subscription_initial` / `invoice.paid`)
  5. Zwrot (pełny/częściowy — `charge.refunded`)
  6. Płatność za zmianę grupy (`group_change_payment`)
  7. Płatność extra_fee (`extra_fee_payment`)
- Panel statusu Connect w dashboardzie (`src/features/billing/components/connect-panel.tsx`):
  `charges_enabled`, `payouts_enabled`, wymagania onboardingowe.
- Tryb testowy w `src/app/[locale]/(app)/dashboard/settings/billing/page.tsx`.
- Monitoring ponownych prób webhooków — alerty przy powtarzalnych błędach.

Istniejąca infrastruktura (do re-use): `src/features/billing/connect-*.ts`,
`src/lib/adapters/billing`, webhooki w `src/app/api/billing/connect/webhook/route.ts`.

## 7. Faza 6 — Initial data / onboarding (wybór niszy)

**Cel:** zamiast wymuszać dodawanie bloków — predefiniowane sekcje + seed na podstawie niszy.

- W onboardingu pytanie „Czym się zajmujesz?" → select: Pływanie / Szkoła / Taniec / Inne.
- Rozszerzyć `createOrganizationAction` o tworzenie:
  - Stron domyślnych: Home, 404, Listing zapisów, O nas, Kontakt
  - Szablon group type per nisza
  - Domyślny motyw (kolory, fonty) z presetu niszy
  - Przykładowe posty bloga
- **Nisza w `organization`** — nowa kolumna `niche: 'swimming' | 'school' | 'dance' | 'general'`
  (lub w onboarding sequence).
- Post-creation checklist w dashboardzie: „Uzupełnij konfigurację".

## 8. Kluczowe pliki (referencje)

| Plik | Rola |
|------|------|
| `src/lib/db/schema/pages.ts` | Tabela `page` — nowe pageType systemowe |
| `src/lib/db/schema/cms-collections.ts` | `DEFAULT_CMS_COLLECTIONS` + kolekcja `enrollments` |
| `src/features/organizations/actions.ts` | Seed initial data przy tworzeniu org |
| `src/app/(builder)/editor/api/route.ts` | API buildera — data binding, AI, akcje |
| `src/app/(builder)/editor/editor.tsx` | `askAiCallBack` + konfiguracja edytora |
| `packages/chaibuilder-sdk/src/pages/client/components/page-selector-in-header.tsx` | Sekcja „Strony systemowe" w topbarze |
| `src/lib/section-catalog.ts` | Katalog sekcji per nisza + PNG preview |
| `src/lib/blocks-library.ts` | Biblioteka szablonów (rozbudowa o nisze) |
| `src/blocks/` | Bloki zapisów (`Enrollment*`) |
| `src/app/[locale]/(app)/dashboard/group-types/` | Kreator Group Type + Schedule Builder |
| `src/features/billing/connect-*.ts` | Stripe Connect — płatności per tenant |

## 9. Szacowany nakład

| Faza | Nakład |
|---|---|
| F1 — System pages + topbar | 4–5h |
| F2 — Kolekcja Enrollments + bloki | 8–10h |
| F3 — Sekcje per nisza + AI | 6–8h |
| F4 — Dashboard UX (Schedule Builder + wizard) | 8–10h |
| F5 — Stripe Connect E2E + polish | 4–6h |
| F6 — Initial data / onboarding | 4–5h |
| **Łącznie** | **~34–44h** |

## 10. Postęp implementacji

| Faza | Status | Data | Odchyłki / notatki |
|------|--------|------|--------------------|
| F1 — System pages + topbar | ⬜ | — | — |
| F2 — Kolekcja Enrollments | ⬜ | — | — |
| F3 — Sekcje per nisza + AI | ⬜ | — | — |
| F4 — Dashboard UX | ⬜ | — | — |
| F5 — Stripe Connect E2E | ⬜ | — | — |
| F6 — Initial data / onboarding | ⬜ | — | — |