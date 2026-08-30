# Enrollments CMS (mvp-plan F2)

> Status: **zrealizowane** (2026-08-30). Model Shopify-style: produkt = `group_type`,
> kolekcja = listing zapisów, layout szczegółów = `enrollment_template` w ChaiBuilder.

## Decyzje architektoniczne

1. **Brak `/checkout`.** `/zapisy/{slug}` to edytowalna landing page grupy zajęć.
   Interaktywny flow zapisu (kalendarz miesięczny, pakiety, metody płatności, zgody,
   regulamin, slot-first, interest signup) jest **blokiem `EnrollmentBookingFlow`**
   osadzonym w template — sekcją definiowaną w ChaiBuilder. CTA (`EnrollmentHero`,
   `EnrollmentBookingButton`) linkują do kotwicy `#booking` na tej samej stronie.

2. **Jeden domyślny szablon zapisów.** `buildDefaultEnrollmentTemplateBlocks()`
   (`src/lib/enrollment-blocks.ts`) — Hero + harmonogram + cennik + trenerzy +
   polityki + flow zapisu. Renderer używa domyślnych bloków, dopóki właściciel nie
   zaprojektuje własnego layoutu w builderze (`UPDATE_TEMPLATE` tworzy stronę-szablon,
   która wygrywa). Wybór szablonu **per-grupa** odłożony do F4 (`group_type.enrollmentTemplateId`).

3. **Brak `page`-rows per grupę.** W przeciwieństwie do bloga (każdy post = wiersz
   `page`), grupa zajęć NIE ma swojej strony w CMS. Dane liczone są w locie:
   - `getEnrollmentPreviewForGroup` — lekki preview dla bloków statycznych
     (groupType, packages, availability, trainers, policy, consents);
   - `getEnrollmentBookingPayload` — pełny payload dla flow-bloka (per-request,
     świadomy `?m=`/`?trainerId=`, sesji klienta, ceny indywidualnej) — przeniesiona
     logika usuniętego `[groupTypeSlug]/page.tsx`.

4. **Routing.** `(site)/zapisy/[[...slug]]` — resolver CMS:
   - `[]` → listing `/zapisy` (`enrollment_listing`, lazy-create jak `blog_index`);
   - `[slug]` → detail `/zapisy/{slug}` (bloki template + `EnrollmentBookingFlow`);
   - dłuższe → 404.
   `requireServedOrganization()` jest PIERWSZĄ instrukcją (bezpieczeństwo na apex —
   pinowane przez `e2e/langlion-subdomain-routing.spec.ts`).

5. **Kolekcja.** `enrollments` w `DEFAULT_CMS_COLLECTIONS`:
   `pageType: "enrollment_detail"`, `templatePageType: "enrollment_template"`,
   jeden template `tpl-enrollment-default`. Migracja `0079` seeduje istniejące orgi.
   `enrollment_listing` to zwykła strona (jak `blog_index`), nie część kolekcji.

6. **UX — szablony w topbarze, nie w lewym panelu.** Topbarowy selector stron ma
   sekcję **„Zapisy"** (analog „Blog posts"): wiersze szablonów + „+ Utwórz szablon"
   (`AddTemplateModal`, allowlista `["blog", "enrollments"]`). Kolekcja `enrollments`
   jest **ukryta z lewego panelu „CMS Collections"** (`pages-tab.tsx` filtruje ją) —
   jej „treścią" są grupy zajęć zarządzane w dashboardzie („Typy zajęć"), nie strony.
   Kolekcja zostaje jako wewnętrzny rejestr wariantów szablonu (mechanizm SDK jest
   kluczowany po `collectionId`), użytkownik jej nie widzi.

7. **Szablon bez strony = pusty canvas.** Bug SDK: przy wejściu w szablon bez strony
   (nigdy nie edytowany / świeżo utworzony) canvas pokazywał bloki ostatniej strony.
   Fix w `chaibuilder-pages.tsx`: rozróżnienie „ładuje się" (`templateData === undefined`)
   od „załadowane bez strony" → `setBlocks([])`.

8. **Domyślny szablon jest seedowany, grupa nigdy bez szablonu.**
   - `createOrganizationAction` + migracja 0080 tworzą stronę `enrollment_template`
     (slug `tpl-enrollment-default`, bloki = `buildDefaultEnrollmentTemplateBlocks()`)
     — „Domyślny" w edytorze pokazuje od razu ten layout, który renderuje strona.
   - `getEnrollmentTemplateBlocks(tx, orgId, templateId?)` ma łańcuch fallbacków:
     wybrany template → strona → domyślny template → wbudowane bloki. Usunięty/zły
     `templateId` nigdy nie zostawia grupy bez szablonu.
   - **Nie usuwa się ostatniego szablonu**: `DELETE_COLLECTION_TEMPLATE` zwraca 400
     przy `templates.length <= 1`; kosz w `CollectionManager` jest wyłączony (SDK).

9. **Wybór szablonu przy grupie (jak blog).** Kolumna `group_type.enrollmentTemplateId`
   (null = domyślny). Dropdown w `GroupTypeForm` (jak `post.templateId` w blogu),
   zapis przy create/update, trasa `/zapisy/{slug}` przekazuje wybór. Grupy zajęć
   tworzysz w dashboardzie „Typy zajęć"; szablony projektujesz w edytorze „Zapisy".

## Dane bloków

- Bloki statyczne (`EnrollmentHero`, `...Schedule`, `...Pricing`, `...Instructors`,
  `...Policy`) czytają `data` (wstrzykiwane przez `enrichEnrollmentBlocks`) w trybie
  publicznym i `enrollmentPreviewAtom` w builderze (SDK `useEnrollmentPreview`).
- `EnrollmentBookingFlow` dostaje `data` = `EnrollmentBookingPayload` i renderuje
  `InterestSignupForm` / `SlotFirstFlow` / `EnrollmentFlow` (lazy `next/dynamic`,
  poza bundlem buildera).
- `EnrollmentList` na `/zapisy` dostaje `data.items` (wzbogacane w
  `enrichEnrollmentListingBlocks`), w builderze czyta `/api/blocks/group-types-list`.

## Podgląd w edytorze

Dropdown „Podgląd grupy zajęć" w `TemplateSettings` (gdy `collectionId === "enrollments"`):
`GET_ENROLLMENT_TYPES_LIST` → `GET_ENROLLMENT_PREVIEW` → `enrollmentPreviewAtom`.
`usePageExternalData()` w SDK wstrzykuje `{ enrollment: preview }` podczas edycji
template, dzięki czemu `{{enrollment.*}}` bindingi działają na canvasie. Bloki grupy
`"Enrollment"` są filtrowane w `default-blocks.tsx` — widoczne tylko w tym template.

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/db/schema/cms-collections.ts` | Kolekcja `enrollments` w seedzie |
| `src/lib/db/migrations/0079_enrollments_collection.sql` | Seed istniejących orgów |
| `src/lib/db/migrations/0080_enrollment_template_default.sql` | `group_type.enrollmentTemplateId` + seed strony default-template |
| `src/lib/enrollment-data.ts` | Preview, booking payload, template blocks (fallback), `getEnrollmentTemplates` |
| `src/lib/enrollment-blocks.ts` | Czyste fabryki domyślnych bloków (testowalne) |
| `src/blocks/Enrollment/` | 8 bloków zapisów |
| `src/app/[locale]/(site)/zapisy/[[...slug]]/page.tsx` | Publiczny resolver |
| `src/features/groups/components/group-type-form.tsx` | Dropdown wyboru szablonu grupy |
| `packages/chaibuilder-sdk/src/pages/chaibuilder-pages.tsx` | Fix: blank canvas dla szablonu bez strony |
| `packages/chaibuilder-sdk/src/hooks/use-enrollment-preview.ts` | Atom podglądu |
| `packages/chaibuilder-sdk/src/pages/client/components/page-selector-in-header.tsx` | Sekcja „Zapisy" w topbarze + `AddTemplateModal` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | Ukrycie `enrollments` z „CMS Collections" |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/template-settings.tsx` | Dropdown podglądu |
| `src/app/(builder)/editor/api/route.ts` | `GET_ENROLLMENT_PREVIEW`, `GET_ENROLLMENT_TYPES_LIST` |

## Testy

- `src/lib/enrollment-data.test.ts` — czyste fabryki bloków (komplet sekcji, świeże id).
- `src/app/(builder)/editor/i18n.test.ts` — klucze dropdownu w en.json + pl.json.
- SDK vitest (681) + build zielony; root `tsc --noEmit` tylko 5 pre-existing błędów
  (`e2e/*`, `admin-preview.test.ts`).
- e2e: booking flow nadal pod `/zapisy/{slug}` (URL bez zmian) — do zweryfikowania
  w środowisku z DB/Stripe.