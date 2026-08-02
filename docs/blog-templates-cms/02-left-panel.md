# Faza 2: Lewy panel — drzewo kolekcji CMS

## Cel

Przebudowa zakładki „Strony" w lewym panelu: sekcja **SZABLONY (KOLEKCJE CMS)** jako rozwijane listy — kolekcja (np. „Wpis na blogu") → `Wszystkie wpisy (N)` + warianty szablonów. Plus wskaźniki statusu przy stronach (Live / Robocza / Ukryta).

## Stan obecny

- `pages-tab.tsx` grupuje przez `groupPages()` (Pages / Templates / System) i renderuje `RenderPageItems` → `PageItem`.
- `page-groups.ts` — `TEMPLATE_PAGE_TYPE = "template"`, `isSystemPageType` po `pageType.isSystem`.
- `useWebsitePrimaryPages()` (React Query) — lista stron.
- Strony nie mają widocznych statusów w drzewie (PageItem pokazuje nazwę + akcje).

## 1. Struktura docelowa drzewa

```
STRONY
  Strona główna        [Live]
  Kursy językowe       [Robocza]
  Cennik               [Ukryta]

SZABLONY (KOLEKCJE CMS)
  ▾ Wpis na blogu                       31 wpisów
    ├─ Wszystkie wpisy (31)             otwórz ⧉
    ├─ Szablon: Klasyczny Artykuł       ● (aktywny)
    └─ Szablon: Wywiad / Case Study
  ▸ Kursy / Nauczyciele                 12 wpisów

SYSTEMOWE
  Formularz zapisu
  404
```

## 2. Komponenty

### `pages-tab.tsx` (zmiana)
- Dodać hook `useCollections()` (pobiera `GET_COLLECTIONS`).
- Zamiast jednej grupy „Templates" renderować sekcje kolekcji (jeśli `collections.length > 0`).
- Zachować istniejące akcje CRUD dla zwykłych stron.

### `use-collections.ts` (nowy)
**Plik:** `packages/chaibuilder-sdk/src/pages/hooks/pages/use-collections.ts`

```ts
export type CmsTemplateVm = { id: string; name: string; layout: string };
export type CmsCollectionVm = {
  id: string; name: string; pageType: string;
  postCount: number;
  templates: CmsTemplateVm[];
};
export const useCollections = () => useQuery({ queryKey: ["cms-collections"], queryFn: ... });
```

### `collection-tree-group.tsx` (nowy)
**Plik:** `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/collection-tree-group.tsx`

- Nagłówek kolekcji: chevron (▸/▾), ikona, nazwa, licznik wpisów.
- Stan rozwinięcia: `useState<Record<string, boolean>>` w `pages-tab.tsx` lub `usePageExpandManager` (istniejący hook).
- Po rozwinięciu:
  - Wiersz **„Wszystkie wpisy (N)"** → `onOpenPosts(collectionId)` → Faza 3 (modal).
  - Wiersz **„Szablon: {name}"** → `onOpenTemplate(templateId, collectionId)` → Faza 4.
  - Wskaźnik aktywnego szablonu (np. `●`) gdy `editorMode.type === "template"`.
- Używa stylów wg `PageItem` (h-8/9, rounded, hover bg-muted).

### `page-groups.ts` (zmiana)
- `groupPages()` zostaje dla `Pages` i `System`.
- Grupa `Templates` (pageType `"template"`) — zostawić, ale ODDZIELNĄ sekcją renderują się kolekcje (template-y layoutu `blog_post_template` nie wpadają do `Pages` — dodać je do `Templates` bucket lub ukryć z drzewa stron, bo nimi zarządza kolekcja).

### Statusy stron (Live/Robocza/Ukryta)
- `PageItem`/nowy wariant: badge po lewej/za nazwą:
  - `online === true` → „Live" (zielony badge).
  - `online === false && status !== "archived"` → „Robocza" (żółty).
  - `status === "archived"` → „Ukryta" (szary).
- Dane: `toChaiPage` ma `online` (z `status`) — F1 już to zwraca.

## 3. Definition of Done

- [ ] Sekcja „SZABLONY (KOLEKCJE CMS)" renderuje się w Pages tab z danych `GET_COLLECTIONS`.
- [ ] Kolekcje rozwijają się/zwijają (chevron), stan per kolekcja.
- [ ] „Wszystkie wpisy (N)" → wywołuje `onOpenPosts` (modal w F3).
- [ ] „Szablon: X" → wywołuje `onOpenTemplate` (edycja szablonu w F4).
- [ ] Aktywny szablon ma wskaźnik w drzewie.
- [ ] Strony w STRONY mają badge statusu (Live/Robocza/Ukryta).
- [ ] Brak regresji dla istniejących akcji CRUD stron.

## 4. Testy

### Manualne QA
- [ ] Pusta organizacja (0 kolekcji) → sekcja SZABLONY nie renderuje się lub pokazuje stan pusty.
- [ ] Kolekcja z 0 wpisów → „Wszystkie wpisy (0)".
- [ ] Przełączanie zakładki Sekcje↔Strony zachowuje stan rozwinięcia kolekcji.
- [ ] Search w Pages tab filtruje też wpisy kolekcji.

## 5. Pliki

| Plik | Akcja |
|------|-------|
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | **Zmiana** — sekcja kolekcji + statusy |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/collection-tree-group.tsx` | **Nowy** — rozwijana grupa kolekcji |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/page-groups.ts` | **Zmiana** — obsługa pageType szablonów layoutu |
| `packages/chaibuilder-sdk/src/pages/hooks/pages/use-collections.ts` | **Nowy** — hook `GET_COLLECTIONS` |
| `packages/chaibuilder-sdk/src/pages/client/components/page-manager/page-item.tsx` | **Zmiana** — badge statusu |

## 6. Szacowany nakład

3–4h — komponent drzewa kolekcji, statusy, integracja z Pages tab.
