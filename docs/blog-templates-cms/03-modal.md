# Faza 3: Modal „Lista wpisów" + krok wyboru szablonu

> **⚠️ Superseded 2026-08-03.** Zarządzanie postami przenosi się do dashboardu
> (F5.1). Kod modala jest do usunięcia w F5.0. Patrz `08-blog-cms-redesign.md`.

## Cel

Zarządzanie bazą postów bez opuszczania buildera: po kliknięciu „Wszystkie wpisy" canvas zostaje przyciemniony, a na wierzchu pojawia się wycentrowany szeroki **Modal** z tabelą wpisów. Zawiera search, filtr szkiców, „+ Nowy wpis" oraz dwustopniowy przepływ: lista → (nowy wpis) → wybór szablonu → zamknięcie.

## Stan obecny

- Brak jakiegokolwiek modala listy wpisów — posty są wierszami w Pages tab.
- Dostępne wzorce modali: `AddNewPage`, `DeletePage`, `DuplicatePage` (shadcn/ui Dialog, lazy + Suspense), `ChaiSidebarPanel` z `view: "modal" | "overlay" | "drawer"`.
- Integracja z layoutem: `builder-layout.tsx` ma już `<AddBlocksDialog />` na końcu drzewa.

## 1. Stan modala

```
type PostsModalState =
  | { open: false }
  | { open: true; collectionId: string; step: "list" | "choose" };
```

- `"list"` — tabela wpisów (domyślny po otwarciu).
- `"choose"` — krok wyboru szablonu dla nowego wpisu (kafelki 2-kolumnowe).

## 2. Komponenty

**Katalog:** `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/`

| Komponent | Rola |
|---|---|
| `posts-manager-modal.tsx` | Główny modal (Dialog z overlayem nad canvasem) |
| `posts-list.tsx` | Search + filtr „Tylko szkice" + tabela (header: Tytuł \| Szablon \| Data \| Status) |
| `posts-list-row.tsx` | Wiersz z badge statusu (Opublikowany/Szkic) |
| `template-selector.tsx` | Kafelki szablonów (grid 2 kolumny: preview, nazwa, opis) |
| `use-posts-manager.ts` | Hook stanu + zapytania (`LIST_COLLECTION_ITEMS`) |

### `posts-manager-modal.tsx`
- **Trigger:** `usePostsManager()` — stan otwarty po kliknięciu „Wszystkie wpisy" w F2 (`onOpenPosts`).
- **Overlay:** `Dialog` (shadcn) z `DialogOverlay` — canvas przyciemniony (`bg-black/40`).
- **Header:** „Zarządzaj wpisami: {nazwa kolekcji}" + przycisk **[＋ Nowy wpis]** (po prawej) + [✕].
- **Body (step= list):** `PostsList`.
- **Body (step= choose):** `TemplateSelector` + „‹ Wróć do listy wpisów".
- **Footer hint:** „Kliknij wiersz, aby edytować treść wpisu. Builder zostaje w tle."

### `posts-list.tsx`
- Wyszukiwarka (input, debounce) → `LIST_COLLECTION_ITEMS { search }`.
- Chip „Tylko szkice" → `LIST_COLLECTION_ITEMS { draftsOnly }`.
- Licznik: „X z N".
- Tabela: kolumny `TYTUŁ WPISU | SZABLON | DATA | STATUS`.
- Wiersze z `PostsListRow` (hover bg, cursor-pointer).

### `template-selector.tsx`
- „Wybierz szablon dla nowego wpisu" + podpis „Szablon zmienisz później w ustawieniach wpisu."
- Kafelki z `GET_COLLECTIONS → collection.templates` (nazwa, opis, mini-preview).
- Klik kafelka → `CREATE_COLLECTION_ITEM { collectionId, templateId }` → `closeModal()` + `navigateToPost(newPageId)` + tryb F5.

## 3. Przepływy

```
1. "Wszystkie wpisy (31)" [F2]          → modal step="list"
2. klik wiersza                          → closeModal() → editorMode = post → F5
3. "+ Nowy wpis"                         → step="choose"
4. klik kafelka szablonu                 → CREATE_COLLECTION_ITEM → closeModal() → editorMode = post (nowy) → F5
5. "‹ Wróć do listy wpisów"              → step="list"
6. "✕" / ESC / klik poza                 → closeModal()
```

## 4. Integracja z layoutem

**Plik:** `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx`

```tsx
<>
  {/* ... istniejący layout ... */}
  <PostsManagerModal />   // obok <AddBlocksDialog />
</>
```

- Modal renderowany zawsze (sam decyduje o otwarciu przez stan) lub tylko gdy `state.open`.
- Brak wpływu na `rightPanelAtom` — user pozostaje w kontekście buildera.

## 5. Definition of Done

- [ ] Klik „Wszystkie wpisy" otwiera modal nad przyciemnionym canvasem.
- [ ] Tabela: Tytuł \| Szablon \| Data \| Status (badge).
- [ ] Search (debounce) + filtr „Tylko szkice" + licznik.
- [ ] „+ Nowy wpis" → krok wyboru szablonu (kafelki).
- [ ] Klik kafelka tworzy wpis, zamyka modal, przechodzi do edycji posta (F5).
- [ ] Klik wiersza zamyka modal i otwiera edycję posta (F5).
- [ ] „✕" / ESC / klik poza zamyka modal.
- [ ] Empty state (brak wpisów) + loading state.

## 6. Testy

### Manualne QA
- [ ] Search filtruje w czasie rzeczywistym (po debounce).
- [ ] „Tylko szkice" pokazuje wyłącznie `status = draft`.
- [ ] Modal nie resetuje canvasu (bloki strony w tle nietknięte).
- [ ] Zmiana kolekcji (blog vs kursy) ładuje właściwe wpisy i szablony.
- [ ] Błąd `CREATE_COLLECTION_ITEM` (np. slug collision) nie zamyka modala.

## 7. Pliki

| Plik | Akcja |
|------|-------|
| `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/posts-manager-modal.tsx` | **Nowy** |
| `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/posts-list.tsx` | **Nowy** |
| `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/posts-list-row.tsx` | **Nowy** |
| `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/template-selector.tsx` | **Nowy** |
| `packages/chaibuilder-sdk/src/pages/client/components/posts-manager/use-posts-manager.ts` | **Nowy** |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | **Zmiana** — render `PostsManagerModal` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | **Zmiana** — `onOpenPosts` (F2) |

## 8. Szacowany nakład

3–4h — modal, tabela, wybór szablonu, przepływy.
