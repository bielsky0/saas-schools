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
- **AI provider ustawiony na sztywno w kodzie** — klient nie zmienia modelu. Na razie
  **nie implementujemy logiki AI** — tylko workflow/UI (stub), logika później.
- **Strona 404** — normalnie edytowalna, ale są gotowe sekcje do niej.
- **Listing zapisów** — edytowalny w edytorze, z gotowymi sekcjami.
- **Predefiniowane sekcje mają preview jako PNG** (jak w oryginalnym ChaiLibrary — to działało dobrze).
  PNG-y generuję **ręcznie**.

## 0a. Builder stron — architektura „Section First"

**Wizja:** bloki nadal można dodawać ręcznie, ale UI **faworyzuje edytowanie sekcji przez AI**,
a nie precyzyjne ręczne układanie bloków. Sekcje działają tak jak teraz — mechanizm się nie
zmienia, tylko UI/UX ukierunkowuje użytkownika na sekcje + AI.

| Panel | Rola |
|-------|------|
| **Left Panel** | **Bez zmian** — działa jak teraz (block picker, sekcje, dolny panel styli po kliknięciu elementu, mechanizm F7.1/F7.2). Nie dodajemy nowej zakładki „Sekcje" na razie. |
| **Right Panel** | **Tylko AI Assistant** — brak tam edycji stylów (Style tab NIE jest w right panelu). Na razie placeholder/stub (F7.4 `AiPanel`). |
| **Canvas** | Section-first: DND sekcji, reorder. Sekcja = Container z predefiniowanymi dziećmi (jak teraz). |
| **AI (później)** | Operuje na sekcjach przez tool calling: insert, replace, updateStyle, reorder. Model hardcoded. |

Kluczowe decyzje UX (utrwalone):

- **Right panel = wyłącznie AI Assistant.** Nie dodajemy tam zakładki Style.
- **Edycja stylów** danego bloku/sekcji odbywa się w **left panelu** po kliknięciu elementu na
  kanwie — **zostawiamy obecny mechanizm** (dolny panel z F7.1/F7.2) **bez zmian w lewym panelu**.
- **Sekcje działają jak teraz** (SDK `SectionCatalogEntry` + `role: "template"`), bez zmian
  w mechanizmie — **logika budowania nie zmienia się**. Section-first to tylko faworyzacja
  w UI/UX (szczegóły jak ma działać opiszę później).
- **AI na razie nie budujemy** — robimy UI/workflow (gdzie przycisk, jaki panel, jak wygląda),
  logika podpięta później.
- **Brak zmian w SDK left panelu** (`builder-left-panel.tsx`) — obecny stan zostaje.

## 1. Graficzny plan faz

```
Faza 1 ─── System pages + widoczność w topbarze
   │
Faza 2 ─── Kolekcja Enrollments (model Shopify: produkt = GroupType, kolekcja = listing)
   │
Faza 3 ─── Sekcje per nisza + Section-First UX (PNG preview, stub AI)
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

**Cel:** wbudowane strony (404) edytowalne w ChaiBuilder, widoczne od razu w topbarze.

> **Odchyłka (2026-08-30):** tylko `system_404` jest stroną systemową. Strony zapisów
> (`enrollment_detail`, `enrollment_listing`) **nie** są systemowe — działają w modelu
> CMS kolekcji + szablonów (F2, wzorzec Shopify/blog): produkt = GroupType,
> layout przez `enrollment_template`, listing = `enrollment_listing` (analog `blog_index`),
> wybór szablonu w dashboardzie przy grupie zapisów.

- Nowe `pageType` systemowe w `src/lib/db/schema/pages.ts`:
  - `system_404`
- Seed domyślnych stron w `createOrganizationAction` (`src/features/organizations/actions.ts`,
  obecnie seeduje tylko `cms_collection`): Home, 404.
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

> **Decyzje (2026-08-30, po implementacji):**
> - **Brak `/checkout`.** `/zapisy/{slug}` to CMS landing page; interaktywny flow
>   zapisu (kalendarz, pakiety, płatności, zgody, slot-first, interest) jest
>   **blokiem `EnrollmentBookingFlow`** osadzonym w template — sekcją w ChaiBuilder.
> - **Jeden domyślny szablon zapisów** (`buildDefaultEnrollmentTemplateBlocks`).
>   Wybór szablonu per-grupa (`group_type.enrollmentTemplateId`) odkładamy do F4.
> - **Brak `page`-rows per grupę**: renderer zawsze liczy dane grupy w locie
>   (`getEnrollmentBookingPayload` = logika starego `[groupTypeSlug]/page.tsx`).

- `DEFAULT_CMS_COLLECTIONS` (`src/lib/db/schema/cms-collections.ts`) + `"enrollments"`
  (pageType: `enrollment_detail`, templatePageType: `enrollment_template`).
- **Bloki dedykowane zapisom** (tylko w tej kolekcji dostępne), w `src/blocks/Enrollment/`:
  - `EnrollmentHero` — nazwa, opis, cena, CTA (kotwica `#booking`)
  - `EnrollmentSchedule` — lista nadchodzących sesji (logika z `UpcomingEvents`)
  - `EnrollmentPricing` — pakiety, subskrypcje
  - `EnrollmentInstructors` — karty trenerów
  - `EnrollmentPolicy` — zgody/polityki
  - `EnrollmentBookingButton` — CTA do sekcji zapisu
  - `EnrollmentBookingFlow` — **cały interaktywny flow** (kalendarz, płatności, zgody)
  - `EnrollmentList` — siatka kart na `/zapisy`
- Rejestracja w `src/blocks/index.ts` + `src/lib/section-catalog.ts`.
- **Data binding:** bloki czytają `data` (serwerowe wzbogacanie) i `{{enrollment.*}}`
  przez `externalData: { groupType, packages, availability, trainers }` (wzorzec bloga).
- **Publiczna trasa** `/zapisy/[[...slug]]` → resolver CMS (zastępuje obecny sztywny
  `src/app/[locale]/(site)/zapisy/[groupTypeSlug]/page.tsx`).
- Dashboard: właściciel edytuje `enrollment_listing` (siatka kart) i `enrollment_template`
  (layout szczegółów) w ChaiBuilder; na liście/detailu group-type przycisk „Podgląd strony".

Kluczowe pliki:
- `src/lib/db/schema/cms-collections.ts` — nowa kolekcja `enrollments`
- `src/blocks/Enrollment*/` (new) — bloki + configs
- `src/lib/blocks-library.ts` / `src/lib/blocks-library/` — szablony stron zapisów
- `src/app/[locale]/(site)/zapisy/[[...slug]]/page.tsx` (replace) — renderer CMS
- `src/app/(builder)/editor/api/route.ts` — data binding dla `enrollment_detail`

## 4. Faza 3 — Sekcje per nisza + Section-First UX (+ stub AI)

**Cel:** predefiniowane sekcje zamiast wymuszania dodawania bloków; UI faworyzuje sekcje i AI.
Logikę AI **odkładamy** — na razie tylko workflow i wygląd.

### 4.1 Biblioteka sekcji z PNG preview

- SDK wspiera `thumbnail` w `SectionCatalogEntry` (`src/types/section-catalog.ts`):
  `"auto"` = render z default props; **URL** = bezpośredni obrazek.
- Stworzyć `public/section-previews/{niche}/*.png` — screenshoty sekcji (**generuję ręcznie**).
- `src/lib/blocks-library/{swimming,school,dance,general}-sections.ts`:
  - `swimming` — hero z basenem, siatka harmonogramu, karty trenerów, tabela cen
  - `school` — siatka programu, profile nauczycieli, karuzela opinii, formularz kontaktowy
  - `dance` — galeria, harmonogram, progresja poziomów, CTA zapisu
- `langlionLibrary` → rejestr scalający wszystkie nisze.
- `src/lib/section-catalog.ts` — kategorie: `hero`, `grid`, `cards`, `forms`, `pricing`,
  `testimonials`; każdy wpis ma `thumbnail: "/section-previews/...png"`.
- Sekcje do 404 i listingu — gotowe warianty.

### 4.2 Section-First UX (bez zmian w lewym panelu)

> **Decyzja (2026-08-23):** lewy panel zostaje jak jest — **żadnych zmian w SDK**
> (`builder-left-panel.tsx`). Szczegóły jak ma działać faworyzacja sekcji i AI — **do
> doprecyzowania później** (w osobnym opisie od właściciela projektu).

- **Left panel bez zmian** — obecny stan (block picker + dolny panel styli F7.1/F7.2).
- **Right panel = tylko AI Assistant** — na razie placeholder (stub z F7.4 `AiPanel`).
- **Edycja stylów** w left panelu po kliknięciu elementu na kanwie (mechanizm F7.1/F7.2 — bez zmian).
- Sekcje wylistowane w `section-catalog.ts` + dostępne z biblioteki (`blocks-library`).
- Faworyzacja sekcji przez UI/UX + szczegóły AI workflow — **poźniej, po doprecyzowaniu**.

### 4.3 AI w edytorze (PÓŹNIEJ — logika, nie teraz)

> **Decyzja (2026-08-23):** logika AI odłożona. Na razie budujemy tylko workflow/UI
> (gdzie przycisk, jaki panel, jak wygląda). Poniżej zapis planu na przyszłość.

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
| `src/app/(builder)/editor/api/route.ts` | API buildera — data binding, (później) AI, akcje |
| `src/app/(builder)/editor/editor.tsx` | Konfiguracja edytora, (później) `askAiCallBack` |
| `packages/chaibuilder-sdk/src/pages/client/components/page-selector-in-header.tsx` | Sekcja „Strony systemowe" w topbarze |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/` | Right panel = tylko AI Assistant (stub, bez zmian na razie) |
| `src/lib/section-catalog.ts` | Katalog sekcji per nisza + PNG preview |
| `src/lib/blocks-library.ts` | Biblioteka szablonów (rozbudowa o nisze) |
| `src/blocks/` | Bloki zapisów (`src/blocks/Enrollment/`) |
| `src/lib/enrollment-data.ts` | Warstwa danych zapisów (preview, booking payload, template blocks) |
| `src/lib/enrollment-blocks.ts` | Domyślne bloki template/listingu zapisów (czyste fabryki) |
| `src/app/[locale]/(site)/zapisy/[[...slug]]/page.tsx` | Publiczny resolver CMS zapisów |
| `src/lib/db/migrations/0079_enrollments_collection.sql` | Seed kolekcji `enrollments` dla istniejących orgów |
| `packages/chaibuilder-sdk/src/hooks/use-enrollment-preview.ts` | `enrollmentPreviewAtom` + `useEnrollmentPreview` (podgląd grupy w edytorze) |
| `src/app/[locale]/(app)/dashboard/group-types/` | Kreator Group Type + Schedule Builder |
| `src/features/billing/connect-*.ts` | Stripe Connect — płatności per tenant |

## 9. Szacowany nakład

| Faza | Nakład |
|---|---|
| F1 — System pages + topbar | 4–5h |
| F2 — Kolekcja Enrollments + bloki | 8–10h |
| F3 — Sekcje per nisza + Section-First UX (stub AI) | 6–8h |
| F4 — Dashboard UX (Schedule Builder + wizard) | 8–10h |
| F5 — Stripe Connect E2E + polish | 4–6h |
| F6 — Initial data / onboarding | 4–5h |
| **Łącznie** | **~34–44h** |

## 10. Postęp implementacji

| Faza | Status | Data | Odchyłki / notatki |
|------|--------|------|--------------------|
| F1 — System pages + topbar | ✅ | 2026-08-30 | Rejestr w `src/lib/system-pages.ts` (jedyne źródło prawdy). **Tylko `system_404`** jest systemowa — strony zapisów (`enrollment_detail`/`enrollment_listing`) przeniesione do F2 (kolekcja + szablony, wzorzec bloga; wybór szablonu w dashboardzie przy grupie). Seed: Home + 404 dla nowych orgów. Renderer 404 przez `CmsPageView` (`src/app/[locale]/not-found.tsx`). Backend edytora: `isSystem` w `buildPageTypes`, guardy DELETE/DUPLICATE/UPDATE-PageType/MARK_AS_TEMPLATE. SDK: typ `isSystem`, sekcja „Strony systemowe" w PageSelector, wykluczenie z kreatora/filtra/dropdownu. Szczegóły: `docs/architecture/system-pages.md` |
| F2 — Kolekcja Enrollments | ✅ | 2026-08-30 | Kolekcja `enrollments` (`enrollment_detail`/`enrollment_template`) w `DEFAULT_CMS_COLLECTIONS` + migracja 0079 (seed istniejących orgów). **Brak `/checkout`** — booking to blok `EnrollmentBookingFlow` (EmbedFlow: `EnrollmentFlow`/`SlotFirstFlow`/interest) osadzony w template; `(site)/zapisy/[[...slug]]` = resolver CMS (listing `/zapisy` + detail `/zapisy/{slug}`), `requireServedOrganization()` jako pierwsza instrukcja. **Jeden domyślny szablon** (`buildDefaultEnrollmentTemplateBlocks` w `src/lib/enrollment-blocks.ts`) — seedowany jako strona `enrollment_template` (migracja 0080); `group_type.enrollmentTemplateId` + dropdown w formularzu grupy (jak blog); fallback łańcuch — grupa nigdy bez szablonu; brak usuwania ostatniego szablonu (guard API + disabled w UI). 8 bloków w `src/blocks/Enrollment/` + SDK: `enrollmentPreviewAtom`/`useEnrollmentPreview`, dropdown „Podgląd grupy zajęć" w `TemplateSettings`, filtr `default-blocks.tsx`, akcje `GET_ENROLLMENT_PREVIEW`/`GET_ENROLLMENT_TYPES_LIST`. **UX:** szablony zapisów w **topbarze** (sekcja „Zapisy" jak „Blog posts", tworzenie przez `AddTemplateModal` z allowlistą blog+enrollments); kolekcja **ukryta z lewego panelu „CMS Collections"** (treścią są grupy zajęć z dashboardu „Typy zajęć", nie strony). **Fix SDK:** szablon bez strony = pusty canvas (nie bloki poprzedniej strony). Szczegóły: `docs/architecture/enrollments-cms.md` |
| F3 — Sekcje per nisza + Section-First UX | ✅ | 2026-08-30 | Sekcje per nisza w `src/lib/blocks-library/{swimming,school,dance,general}-sections.ts` (5 szablonów × 4 nisze). Sekcje systemowe: `page-404-hero`, `enrollment-listing-hero` w `blocks-library.ts`. **AI:** `ASK_AI` w `route.ts` deleguje do SDK's `initChaiBuilderActionHandler` → `AskAIAction` → Vercel AI SDK (`streamText`), 9 modeli (Gemini, GPT, Claude). SDK: `askAiCallBack` prop w `ChaiWebsiteBuilderProps` + pick w `chaibuilder-pages.tsx`. `openai` npm usunięty — SDK używa Vercel AI SDK. Model selector zostaje widoczny (deweloper). Left panel bez zmian (section-first UX = doprecyzowanie później). PNG preview — do zrobienia ręcznie (osobna sesja). |
| F4 — Dashboard UX | ⬜ | — | — |
| F5 — Stripe Connect E2E | ⬜ | — | — |
| F6 — Initial data / onboarding | ⬜ | — | — |