# Plan: Segmented control „Biblioteka / Sekcje” w pickerze bloków i sekcji

## Kontekst / cel

Dodać do współdzielonego popovera (`PickerPopover`) Shopify-style segmented control z dwoma zakładkami, oddzielający:

- **Biblioteka** — gotowe, predefiniowane sekcje (templaty z `langlionLibrary`, obecnie merge'owane do wspólnej listy w `section-picker.tsx`)
- druga zakładka — regularne kategorie:
  - w **Section Picker**: etykieta **„Sekcje”** (kategorie edytorskie: Banery, Formularze, Kolekcje, …)
  - w **Block Picker**: etykieta **„Bloki”** (kategorie bloków: Podstawowe, Produkt, Formularze, …)

Zakładka **Biblioteka jest aktywna domyślnie** (pierwsza), bo „w bibliotece są gotowe sekcje do wstawienia jak pierwszy wybór”.

Zakres: **oboje** pickerów (Section + Block), etykiety rozdzielnie (Sekcje/Bloki).

---

## Pliki do zmiany (SDK — fork `packages/chaibuilder-sdk/`)

### 1. `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/picker/picker-categories.ts`

**Dodać typ (obok `PickerCategory` ~linia 47):**

```ts
export type PickerTab = {
  id: string;            // unikalne, np. "library" | "sections"/"blocks"
  label: string;         // i18n key: "Biblioteka" | "Sekcje" | "Bloki"
  categories: PickerCategory[];
};
```

Nic więcej tu nie zmieniamy — `createLibraryPickerCategory` już zwraca pojedynczą `PickerCategory` z grupowaniem (Langlion, Blog, Pływanie, Szkoła, Taniec, Ogólne, Systemowe) i pozostaje źródłem danych dla zakładki Biblioteka.

---

### 2. `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/picker/picker-popover.tsx` — rdzeń zmiany

#### Props (zastąpić `categories`)

```ts
type PickerPopoverProps = {
  trigger: ReactNode;
  searchPlaceholder: string;
  dialogLabel: string;
  tabs: PickerTab[];                 // zamiast categories
  onAdd: (item: PickerItem) => void;
  renderIcon?: (item: PickerItem) => ReactNode;
  renderPreview?: (item: PickerItem) => ReactNode;
};
```

> Kłopot: `BlockPickerPopover` i `SectionPickerPopover` podają `categories` przez props. Oba są w tym repo, więc przebudowujemy je razem (bez backward-compat).

#### Nowy stan

```ts
const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? ""); // domyślnie pierwsza = Biblioteka
const [query, setQuery] = useState("");
const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
const [hovered, setHovered] = useState<PickerItem | null>(null);
```

Wyprowadzone:

```ts
const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
const filtered = useMemo(() => filterPickerCategories(activeTab?.categories ?? [], query), [activeTab, query]);
const firstItem = filtered[0]?.items[0] ?? null;
const activeItem = hovered ?? firstItem;
```

#### Nowy stan interakcji zmiany zakładki

```ts
const switchTab = (id: string) => {
  setActiveTabId(id);
  setHovered(null);       // reset podglądu
  setQuery("");           // reset wyszukiwania
  setCollapsed(new Set()); // domyślnie wszystko rozwinięte
};
```

#### Nowy stan handleAdd / handleOpenChange (bez zmian względem obecnego)

- `handleAdd`: `onAdd(item); setOpen(false);`
- `handleOpenChange(true)`: `setQuery(""); setHovered(null);` (zostawiamy `activeTabId` — pamięć ostatniego wyboru w obrębie sesji popovera jest OK; rozważ opcjonalny reset do pierwszego taba przy każdym otwarciu — patrz decyzje otwarte).

#### Struktura lewej kolumny (kolejność w DOM)

```
<div class="flex w-[400px] flex-col border-r border-[#EBEBEB]">
  ├─ <div class="px-4 pb-2 pt-4">        // wyszukiwarka
  ├─ <div class="px-4 pb-2">             // <-- NOWY segmented control
  └─ <ScrollArea class="min-h-0 max-h-[460px] flex-1">
       └─ filtered (kategorie aktywnego taba)
```

#### Segmented control — wygląd (Shopify-style, dopasowany do mocka Tailwind)

- Kontener: `inline-flex items-center rounded-md border border-[#EBEBEB] bg-[#F1F1F1] p-0.5`
- Przycisk (nieaktywny): `rounded-[5px] px-3 py-[5px] text-[13px] font-medium text-[#616161] hover:text-[#303030] transition-colors`
- Przycisk (aktywny): `rounded-[5px] px-3 py-[5px] text-[13px] font-medium text-[#303030] bg-white shadow-sm`
- Użyj `cn()` + warunkowych klas na podstawie `activeTabId` (jak w mocku: `button.active` → jasne tło + cień).
- Semantyka: grupa `<button role="tab" aria-selected={active}>` w kontenerze `role="tablist"`; kategorie pod spodem oznaczamy `role="tabpanel"`. (Można też użyć Radix `Tabs` — patrz decyzje otwarte.)

Height kontroli ~28–30px, żeby zgrabnie zmieściła się między wyszukiwarką (h-9) a listą.

#### Interakcje listy (bez zmian względem obecnych) — tylko na aktywnym tabie

- Klik w kategorię → `toggleCategory(id)` (zwinięcie/rozwinięcie, chevron rotate)
- Hover na item → `setHovered(item)` → odśwież podgląd po prawej
- Klik item → `handleAdd(item)`
- Pusty wynik / pusty tab → komunikat `t("No results")` / `t("Nothing to add")` (już jest)

---

### 3. `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/section-picker.tsx`

#### Zmiany

- **Usunąć** merge `Biblioteka` do flat list:

  ```ts
  // STARE (linie 63-70)
  const categories = useMemo(() => { const cats=[...baseCategories]; if(libraryCategory.length>0) cats.push({id:"Biblioteka", items:libraryCategory}); return cats; }, [...]);
  ```

- **Zbudować tab**:

  ```ts
  const tabs = useMemo<PickerTab[]>(() => [
    { id: "library", label: "Biblioteka", categories: libraryCategory.length ? [{ id: "Biblioteka", items: libraryCategory }] : [] },
    { id: "sections", label: "Sekcje", categories: baseCategories },
  ], [libraryCategory, baseCategories]);
  ```

- **Przekazać** `<PickerPopover {...} tabs={tabs} />` zamiast `categories`.
- `renderIcon` / `renderPreview` zostają bez zmian (już obsługują `isLibraryTemplate`).

---

### 4. `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/block-picker.tsx`

#### Zmiany

- **Dodać ładowanie biblioteki** (obecnie Block Picker w ogóle jej nie laduje):
  - `import { useChaiLibraries } from "~/runtime/client";`
  - `import { createLibraryPickerCategory } from "./picker/picker-categories";` (już importowane)
  - Stan `libraryCategory: PickerItem[]` + `libraryLoading: boolean`
  - `useEffect` na mount (wzorzec jak w `section-picker.tsx` linie 47–70):

    ```ts
    useEffect(() => {
      let mounted = true;
      setLibraryLoading(true);
      createLibraryPickerCategory(libraries).then((cat) => {
        if (mounted && cat) setLibraryCategory(cat.items);
        setLibraryLoading(false);
      });
      return () => { mounted = false; };
    }, [libraries]);
    ```

- **Zbudować tab**:

  ```ts
  const tabs = useMemo<PickerTab[]>(() => [
    { id: "library", label: "Biblioteka", categories: libraryCategory.length ? [{ id: "Biblioteka", items: libraryCategory }] : [] },
    { id: "blocks", label: "Bloki", categories },
  ], [categories, libraryCategory]);
  ```

- **renderIcon / renderPreview** rozszerzyć o obsługę `isLibraryTemplate` (bo w Block Pickerze biblioteka też będzie widoczna):
  - `renderIcon`: dla `item.isLibraryTemplate` → `<SectionRoleIcon role="section" className="h-4 w-4" />` (jak w section-picker), dla normalnych → `<TypeIcon type={item.type} />`.
  - `renderPreview`: dla `isLibraryTemplate` → placeholder (nagłówek `t(item.label)` + `item.description`), bo `SectionPreview` nie umie renderować templatów biblioteki; dla normalnych → `<SectionPreview type={item.type} />`.
  - Konkretny placeholder: wycentrowany `div` `h-full text-center p-4`, ikona + nazwa + opis (wzorzec z `section-picker.tsx` linie 101–112).
  - (Opcjonalnie dedykowany `onAdd` dla biblioteki — patrz działanie add niżej.)

#### Działanie „add” dla biblioteki w Block Pickerze

W bibliotece każdy template to cała sekcja złożona z wielu bloków → wstawiane do **rodzica = sekcja** (spróbuj dodać na poziomie sekcji, nie wewnątrz wybranego bloku). Dlatego `handleAdd` w BlockPickerze musi rozróżnić:

```ts
const handleAdd = async (item: PickerItem) => {
  if (item.isLibraryTemplate && item.libraryId && item.templateId) {
    const lib = libraries.find(l => l.id === item.libraryId);
    if (lib) {
      const blocks = await lib.getBlock({ block: { id: item.templateId } as any });
      if (blocks?.length) {
        addCoreBlock(blocks, parentId ?? null, position); // addPredefinedBlock(blocks, parentId, position)
        pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
        return;
      }
    }
  }
  addCoreBlock({ type: item.type }, parentId ?? null, position);
  pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
};
```

> Doprecyzować: czy biblioteczne sekcje w BlockPickerze mają być wstawiane **wewnątrz zaznaczonej sekcji** (`parentId`), czy na **poziom root** (jak w SectionPickerze, który używa `getSectionInsertPosition`). **Do ustalenia z użytkownikiem podczas implementacji** — domyślnie: jak w SectionPickerze (pozycja wstawiania liczona od wybranej sekcji).

---

### 5. `packages/chaibuilder-sdk/src/core/locales/en.json`

Dodać klucze (obok "Sections"/"Blocks"):

```json
"Biblioteka": "Library",
"Sekcje": "Sections",
"Bloki": "Blocks"
```

---

### 6. Rebuild SDK

- `pnpm --filter @chaibuilder/sdk build` (tsc + vite → `dist`), bo app importuje `@chaibuilder/sdk` z `dist` przez exports map.
- Albo uruchomić watch: `pnpm dev:sdk`, jeśli dev-server jeszcze stoi.

---

## Decyzje otwarte do potwierdzenia przed implementacją

1. **Reset aktywnego taba przy otwarciu popovera:** czy przy każdym otwarciu wracamy do „Biblioteka” (spójne z „pierwszy wybór = biblioteka”), czy pamiętamy ostatnio wybrany tab w obrębie komponentu? — Domyślnie: **pamiętaj w obrębie sesji**, ale otwórz na „Biblioteka” przy pierwszym renderze (już spełnione przez `tabs[0]`).

2. **Miejsce wstawiania templatów biblioteki w BlockPickerze** (root vs. wewnątrz sekcji) — patrz sekcja 4.

3. **Czy użyć Radix `Tabs` (shadcn, `components/ui/tabs.tsx`) czy ręcznych `<button role="tab">`?**
   - Radix `Tabs` daje darmową a11y (strzałki, orientację), ale wymaga swapu treści `TabsContent`.
   - Ręczne przyciski są prostsze i pełniej kontrolują wystylowanie (segmenty jak w mocku, jeden kontener).
   - **Domyślnie: ręczne `<button role="tab">` w `role="tablist"`, bo styl segmentów (bordery, highlight) różni się od shadcn TabsList/TabsTrigger** — pełna kontrola.

4. **Widoczność zakładki „Biblioteka”, gdy biblioteka jest pusta/niezaładowana:** jeśli `libraryCategory` pusta → ukryć tab „Biblioteka” (pozostaje tylko „Sekcje”/„Bloki”). Jeśli wszystkie taby puste (teoretycznie z `Sekcje` nie pustym — nie zdarzy się) → komunikat „Nothing to add”. **Domyślnie: ukrywaj pusty tab Biblioteka.**

---

## Kryteria ukończenia / weryfikacja

- Po zbudowaniu SDK typcheck przechodzi (`pnpm --filter @chaibuilder/sdk build`).
- Otwarty `SectionPickerPopover`: domyślnie na tab „Biblioteka” (grupy Langlion/Blog/…), przełączenie na „Sekcje” pokazuje kategorie edytorskie.
- Otwarty `BlockPickerPopover`: domyślnie „Biblioteka”, przełączenie na „Bloki” pokazuje kategorie bloków z uwzględnieniem `canAddBlock`.
- Wyszukiwanie działa tylko w obrębie aktywnego taba; zmiana taba czyści query i podgląd.
- Hover/klik/item, chevrony kategorii, podgląd po prawej — bez regresji.
- Samoczynny check regresji: `pnpm --filter @chaibuilder/sdk test` (baseline w `docs/sdk-test-baseline.md`), jeśli dotyczy zmienionego modułu.
