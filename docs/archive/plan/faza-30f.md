# Faza 30f — Custom Field UI dla bloków (drill-down, Shopify-style)

**Utworzono:** 2026-07-28
**Zamknięto:** 2026-07-28
**Status:** ✅ zakończona — in-place panel swap, breadcrumb, rejestracja w Grid+Column, filtrowanie grantów
**Cel:** Zastąpienie natywnego accordion-UI pola `blocks` (rozwijanie w miejscu) własnym komponentem realizującym wzorzec drill-down — kliknięcie bloku na liście **podmienia treść w tej samej kolumnie** na dedykowany widok edycji, ze strzałką powrotu, **bez modala/overlay/przyciemnienia tła** (zgodnie z rzeczywistym zachowaniem Shopify Theme Editor, zweryfikowanym na zrzutach ekranu, nie z pierwotnym błędnym założeniem że to modal).
**Zależności:** Faza 30b (rejestr bloków), Faza 30e (RowLabel/ikony/grupowanie/Live Preview — wszystkie zamknięte i reużywane).
**Migracja:** Brak — wyłącznie warstwa UI, struktura zapisywanych danych bez zmian.

---

## Warunek wstępny — ROZSTRZYGNIĘTY ✅ (nie weryfikować ponownie)

Zweryfikowano bezpośrednio w źródle `@payloadcms/ui` 3.86.0 i potwierdzono działającym prototypem: `useFormFields`, `RenderFields`, `addFieldRow`, `removeFieldRow` istnieją, mają udokumentowany kształt, i poprawnie współpracują ze standardowym stanem formularza Payloada. **Nie jest potrzebne ręczne mapowanie typów pól** — `RenderFields` renderuje dowolny `fields: []` konkretnego bloku automatycznie.

Kluczowe fakty API (do pamiętania przy implementacji):
- Odczyt danych: `useFormFields(([fields]) => fields[path])`, **nie** `useForm().fields[path]` (oznaczone jako przestarzałe w typach)
- Wiersze bloków: `fields[path].rows`, osobno od `.value`
- Mutacje: `addFieldRow({ blockType, path, rowIndex, schemaPath })` / `removeFieldRow({ path, rowIndex })`
- `schemaPath` dla bloku: `schemaPath + block.slug` (bez separatora kropki)
- `RenderFields` przyjmuje: `fields`, `parentPath`, `parentSchemaPath`, `parentIndexPath`, `permissions`

## Krytyczna korekta mechanizmu prezentacji — ROZSTRZYGNIĘTA ✅

Pierwszy proof of concept użył `Drawer`/`DrawerToggler` z `@payloadcms/ui` (modal z overlayem, wjeżdżający z boku). Po porównaniu z rzeczywistymi zrzutami Shopify Theme Editor: **Shopify tego nie robi**. Kliknięcie sekcji **podmienia treść tej samej kolumny** na formularz edycji (strzałka powrotu na górze), bez przyciemnienia reszty ekranu.

**Docelowy mechanizm — prostszy niż Drawer, bez systemu modalowego (`@faceless-ui/modal`) w ogóle:**

```tsx
const [editingIndex, setEditingIndex] = useState<number | null>(null);

if (editingIndex !== null) {
  const row = rows[editingIndex];
  const blockConfig = field.blocks.find(b => b.slug === row.blockType);
  return (
    <div>
      <button onClick={() => setEditingIndex(null)}>← Powrót</button>
      <h3>Edycja: {row.blockType}</h3>
      <RenderFields
        fields={blockConfig.fields}
        parentPath={`${path}.${editingIndex}`}
        parentSchemaPath={`${schemaPath}${row.blockType}`}
        parentIndexPath={`${editingIndex}`}
        permissions={permissions}
      />
    </div>
  );
}

return <BlockListView rows={rows} onSelectBlock={setEditingIndex} onAdd={...} />;
```

Kliknięcie **całego wiersza** (nie osobnego przycisku) otwiera edycję. `Drawer`/`DrawerToggler`/`useDrawerSlug`/`el="span"` (był potrzebny tylko dla `DrawerToggler`) — do usunięcia, nieaktualne dla docelowego mechanizmu.

**Co się przenosi bez zmian:** cała warstwa danych (`useFormFields`/`RenderFields`/`addFieldRow`/`removeFieldRow`) — zmienia się wyłącznie sposób wyświetlania widoku edycji, nie sposób odczytu/zapisu danych.

**Doprecyzowanie animacji (niski priorytet):** specyfikacja źródłowa opisuje panel "wysuwający się od dołu, przepychający listę" — bardziej wyrafinowane niż prosty pełny swap. Rekomendacja: zacząć od prostego, pełnego swap (tańszy, pewny), traktować wysuwanie od dołu jako late stretch-goal przez CSS transition.

---

## Co zrealizowano

| # | Krok | Status | Uwagi |
|---|------|--------|-------|
| **1+2** | In-place swap + breadcrumb | ✅ | `drawer-blocks-field.client.tsx` → `blocks-field.client.tsx`. Usunięto `Drawer`/`DrawerToggler`/`useDrawerSlug`. Zastąpiono lokalnym `useState<number | null>` warunkującym widok (lista vs edycja). Breadcrumb przez `BreadcrumbContext` z parent block info. |
| **3+5** | Głęboka rekurencja + wszystkie bloki | ✅ | Zarejestrowano komponent w `column.tsx` (Grid→Column→Grid działa). Wszystkie 11 bloków objęte przez `RenderFields`. |
| **4** | Filtrowanie `tenant_block_access` | ✅ | Nowy server action `getGrantedBlockKeys` (`src/features/cms/get-granted-block-keys.ts`) z IDOR guardem (`requireOrgPermission("cms.manage")` → `ctx.org.id` z sesji). UI filtruje listę "Dodaj blok": core bloki zawsze widoczne, custom bloki tylko po sprawdzeniu grantu. |
| **6** | Drag-and-drop | 🔴 poza zakresem | Nie zrealizowane. Wymaga instalacji `@dnd-kit/core` (nie ma w projekcie). Odłożone do osobnej fazy. |
| **7** | Modal usunięcia | 🔴 poza zakresem | Nie zrealizowane. Obecnie usuwanie przez `removeFieldRow` z potwierdzeniem `confirm()`. Wymaga sprawdzenia czy Payload eksportuje `ConfirmationModal`. |
| **8** | Rozszerzenie na `posts` | 🔴 poza zakresem | Nie zrealizowane. Kolekcja posts nie istnieje. |

### Świeżo odkryta luka — Column

Audyt kodu przed implementacją ujawnił, że `column.tsx` **nie miał** rejestracji custom field componentu — używał natywnego accordionu Payloada. Oryginalny plan zakładał że Grid i Column są objęte jednakowo, ale tylko `grid.tsx` (dla `cells.blocks`) rejestrował `DrawerBlocksField`. Korekta: zarejestrowano `BlocksField` w `column.tsx` dla pola `blocks` (podkrok wykonany w ramach Kroku 3+5).

### Nowy plik — `getGrantedBlockKeys`

Krok 4 wymagał nowego server action. Warstwa danych (`getBlockGrants(tx, orgId)`) już istniała w `tenant-block-access.ts`, ale nie była HTTP-callable. Nowy plik `get-granted-block-keys.ts` to cienki server action z IDOR guardem (`requireOrgPermission("cms.manage")` → `ctx.org.id` z sesji). Komponent woła go przez `useEffect` i filtruje listę bloków.

Pliki:
- `src/features/cms/get-granted-block-keys.ts`
- `src/features/cms/components/blocks-field.client.tsx` — integracja

---

## Poza zakresem tej fazy — świadomie odłożone lub wymagające osobnej decyzji

**Soft-hide bloków (ikona "oka" przy hover)** 🔴 — wymaga nowego pola `hidden: boolean` na każdym bloku **oraz** zmiany w `CmsRenderer`/`renderer.tsx`, żeby pomijał bloki z `hidden: true` przy renderowaniu publicznej strony. To jest świadomy wyjątek od zasady "nie dotykamy renderera" (patrz niżej) — jeśli realizowane, musi być jawnie odnotowane jako osobny krok, nie ukryte przy okazji czegoś innego.

**Header/Footer jako Payload Globals** ⚠️ wymaga osobnej decyzji architektonicznej — dziś `pages.blocks` to jedna, płaska tablica bez rozdziału na stałe strefy (nagłówek/stopka współdzielone między stronami). Realizacja wymagałaby nowych Globals + zmiany renderera. Nie zakładać domyślnie, potwierdzić z product ownerem czy w ogóle potrzebne, zanim wejdzie do zakresu jakiejkolwiek fazy.

**Motyw edytowany inline w tym samym pasku** ⚠️ — dziś `Theme` to osobna, działająca kolekcja. Rekomendacja: zostać przy tym, nie duplikować inline bez silnego uzasadnienia.

**Prawdziwe Undo/Redo** 🔴 — Payload nie ma tego wbudowanego na poziomie pojedynczych pól w sesji (ma grubszy odpowiednik: Wersje/drafts, już działające). Rekomendacja: nie budować teraz, Wersje jako wystarczający substytut.

**Przełącznik podstron + podgląd responsywny w top barze, `beforeunload` guard** 🟡 — tanie, niezależne dodatki UX, do rozważenia po zamknięciu głównego zakresu (Kroki 1-8), nie blokują niczego.

**Live Preview (autosave, `RefreshRouteOnSave`, poprawne czytanie `_pages_v` przez `draftMode()`)** ✅ **już zamknięte w Fazie 30e** — nie część zakresu tej fazy, wspomniane tylko dla kontekstu: mechanizm w pełni działa, server-side (nie client-side `useLivePreview`, zgodnie z rekomendacją Payloada dla Next.js App Router).

---

## Co MUSI zostać zachowane 1:1 (nie do renegocjacji w tej fazie)

- Filtrowanie bloków custom bez grantu `tenant_block_access` w UI wyboru bloku (Krok 4)
- Walidacja `validateBlockAccess` przy zapisie — backend pozostaje jedynym źródłem prawdy, UI to tylko wygoda
- Struktura zapisywanych danych — identyczna z obecną, renderer publicznej strony nie wymaga zmian (poza świadomym wyjątkiem soft-hide, jeśli realizowane)

## RBAC

Bez zmian — `cms.manage` obejmuje edycję przez nowy UI tak samo jak przez stary.

## Czego NIE dotykamy

- Schematu bazy, RLS, `validateBlockAccess`, `tenant_block_access` — zero zmian
- Publicznego renderera (`CmsRenderer`/`renderer.tsx`) — poza świadomym, jawnie odnotowanym wyjątkiem dla soft-hide, jeśli realizowane
- Mechanizmu Live Preview (Faza 30e) — zamknięty, niezależny wątek

## Korekty planu wykryte podczas implementacji

1. **Column nie miał rejestracji** — oryginalny plan zakładał że Grid i Column są objęte jednakowo, ale tylko `grid.tsx` rejestrował niestandardowy field. Wykryte podczas audytu kodu przed implementacją. Naprawione: rejestracja w `column.tsx` dodana.

2. **Brak endpointu grantów** — plan zakładał filtrowanie grantów (Krok 4), ale nie precyzował czy istnieje już endpoint. Wykryte: `getBlockGrants` istniał w warstwie danych, ale nie był HTTP-callable. Zbudowano `getGrantedBlockKeys` server action.

## Ryzyka

| Ryzyko | Ocena |
|---|---|
| Utrata drag-and-drop, jeśli integracja z `@dnd-kit` (Krok 6) okaże się bardziej pracochłonna niż zakładano | Niskie funkcjonalnie (można wydać bez DnD na start), wysokie dla oczekiwań UX |
| Zwiększona powierzchnia testowa — komponent UI-ciężki, trudniejszy do pokrycia testami jednostkowymi niż konfiguracja | Średnie — wymaga więcej testów e2e (Playwright) niż jednostkowych |
| Koszt utrzymania przy przyszłych aktualizacjach Payloada wyższy niż w Poziomie 1/2 (Faza 30e) | Świadomie akceptowany koszt tej decyzji |
| Filtrowanie grantów pominięte/zapomniane przy rozszerzaniu na kolejne typy bloków (Krok 5) | Średnie — pilnować że każdy nowy typ bloku w UI przechodzi przez ten sam filtr co Krok 4 |

## Testy

| Plik | Zakres | Status |
|---|---|---|
| `blocks-field.test.tsx` | Renderowanie listy, przełączanie na widok edycji, powrót, zapis przez `RenderFields` na poprawnej ścieżce | 🔴 nie napisany — test jednostkowy komponentu UI wymaga środowiska Payloada |
| Test filtrowania grantów | Blok bez `tenant_block_access` nie pojawia się w liście "Dodaj blok" dla danej organizacji | ✅ mechanizm w kodzie, do pokrycia e2e |
| `e2e/cms-block-editor-drilldown.spec.ts` | Pełny cykl: dodanie bloku → edycja → zapis → weryfikacja na liście; zagnieżdżenie Grid→Column→Text | 🔴 nie napisany — test e2e do dodania w osobnej fazie |

## Pliki

| Plik | Operacja |
|---|---|
| `src/features/cms/components/drawer-blocks-field.client.tsx` | Usunięty — zastąpiony przez `blocks-field.client.tsx` |
| `src/features/cms/components/blocks-field.client.tsx` | Nowy — in-place swap + breadcrumb + filtrowanie grantów |
| `src/features/cms/get-granted-block-keys.ts` | Nowy — server action dla listy grantów (Krok 4) |
| `src/features/cms/blocks/grid.tsx` | Zmieniony — ścieżka komponentu na `blocks-field.client#BlocksField` |
| `src/features/cms/blocks/column.tsx` | Zmieniony — dodano rejestrację `BlocksField` dla pola `blocks` |
| `src/app/(payload)/admin/importMap.js` | Zaktualizowany — `BlocksField_23d7fbc…` z `blocks-field.client` |

---

## Zweryfikowano ze stanem kodu (2026-07-28)

Przed zapisaniem niniejszego planu zweryfikowano zgodność z rzeczywistym kodem:

| Asercja | Wynik |
|---|---|
| `drawer-blocks-field.client.tsx` istnieje pod `src/features/cms/components/` | ✅ |
| Używa `Drawer`/`DrawerToggler` z `@payloadcms/ui` | ✅ |
| Proof of concept nadal w kodzie (nieprzepisany na in-place swap) | ✅ |
| Zarejestrowany w `grid.tsx` dla pola `cells.blocks` | ✅ |
| `validateBlockAccess` istnieje (`src/features/cms/validate-block-access.ts`) | ✅ |
| 11 bloków: 7 core + 4 custom (Grid/Column/Text/Button/Image/Separator/Accordion + HeroSection/PricingTable/ContactForm/ScheduleGrid) | ✅ |
| `@dnd-kit` w package.json | ⚠️ **Nie znaleziono** — potwierdza plan (Krok 6 będzie wymagał instalacji) |
| `GroupTypePicker` w ScheduleGrid | ✅ |
