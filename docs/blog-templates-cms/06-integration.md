# Faza 6: Integracja i polish

## Cel

Sfinalizowanie spójnego doświadczenia: nawigacja między trybami (strona / szablon / post), breadcrumb w topbarze, statusy Live/Robocza/Ukryta, obsługa przejść i edge case'ów, i18n oraz QA całości modułu.

## 1. Globalny stan `editorMode`

**Plik:** `packages/chaibuilder-sdk/src/hooks/use-editor-mode.ts` (finalizacja)

```ts
export type EditorMode =
  | { type: "page"; pageId: string }
  | { type: "template"; templateId: string; collectionId: string }
  | { type: "post"; postId: string; templateId: string; collectionId: string };
```

### Nawigacja (macierz przejść)

| Źródło | Akcja | Cel |
|---|---|---|
| Drzewo: strona | klik | `{ type: "page", pageId }` → right panel `"page"` |
| Drzewo: „Szablon: X" | klik | `{ type: "template", templateId, collectionId }` → right panel `"template"` |
| Drzewo: „Wszystkie wpisy" | klik | **modal** (stan editorMode bez zmian) |
| Modal: wiersz | klik | `{ type: "post", postId, templateId, collectionId }` → right panel `"post"` |
| Modal: „+ Nowy wpis" → kafelek | klik | `{ type: "post", ... }` (nowy) → right panel `"post"` |
| PostSettings: „‹ Wróć do listy" | klik | otwiera modal (editorMode bez zmian) |
| TemplateSettings: „Zobacz wpisy" | klik | otwiera modal |

**Plik:** `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` — centralny switch:

```tsx
{panel === "ai" ? <AskAI />
 : panel === "theme" ? <ThemeEditor />
 : panel === "template" ? <TemplateSettings />
 : panel === "post" ? <PostSettings />
 : panel === "page" ? <PageSettings />
 : selectedBlock ? <SettingsPanel />
 : <EmptyRightPanel />}
```

## 2. Breadcrumb w topbarze

**Plik:** `packages/chaibuilder-sdk/src/pages/extensions/topbar.tsx` (lub `pages/client/layouts/topbar/` wg F1 edytora)

- Strona: `Szkoła XYZ / Strona główna` (ikonka `▤`).
- Szablon: `Szkoła XYZ / Szablon: Klasyczny Artykuł` (ikonka `◫`).
- Wpis: `Szkoła XYZ / Jak zdać FCE w rok` (ikonka `✎`).
- Źródło: `editorMode` + `useCurrentActivePage` / `useTemplateData` / post.

### Przycisk publikacji w topbarze
- Tryb posta: etykieta **„Opublikuj wpis"** (vs „Publikuj" dla strony).
- Status: „Wersja robocza zapisana" / „✓ Zapisano" — z `saveState`.

## 3. Statusy (Live / Robocza / Ukryta)

- **Strony (drzewo F2):** `online === true` → Live; `online === false` → Robocza; `archived` → Ukryta.
- **Posty (modal F3):** `published` → Opublikowany (zielony badge); `draft` → Szkic (żółty).
- **PostSettings:** nagłówek pokazuje bieżący status + akcje zmiany.

## 4. i18n (PL + fallback EN)

Nowe klucze w `packages/chaibuilder-sdk/src/core/locales/` (en.json) + bundle PL w `src/app/(builder)/editor/pl.json` (wzorzec F0.3 z `editor-spec-implementation-plan.md`):

- `Sections`, `Theme`, `Pages` (istnieją), `System pages`, `Templates`,
- `Szablon: `, `Wszystkie wpisy`, `Zarządzaj wpisami: `, `Nowy wpis`, `Tylko szkice`,
- `Wybierz szablon dla nowego wpisu`, `Zapisz szkic`, `Opublikuj wpis`,
- `Wróć do listy wpisów`, `Edytujesz layout szablonu`, `Tryb edycji treści`,
- `Jedna kolumna`, `Z sidebarem`, `Mapowanie danych`, `Domyślne SEO`,
- `Układ zablokowany przez szablon`, statusy: `Live`, `Robocza`, `Ukryta`, `Opublikowany`, `Szkic`.

## 5. Edge case'y

1. **Post bez `templateId`** — render z domyślnym szablonem kolekcji lub „bez szablonu" + CTA przypisania.
2. **Usunięty szablon (`templateId = NULL`)** — post nie crashuje, pokazuje fallback layout.
3. **Pusty canvas szablonu** — hint „Przeciągnij lub dodaj sekcję".
4. **Zmiana kolekcji w modalu** — reset stanu (query, draftsOnly).
5. **Konflikt sluga** przy tworzeniu posta — automatyczny sufiks (F1).
6. **Restart dev servera** po zmianach `package.json` exports SDK.
7. **Przełączanie zakładek lewego panelu** — stan rozwinięcia kolekcji + `editorMode` zachowane.

## 6. Definition of Done

- [ ] Pełna macierz nawigacji między trybami działa bez przeładowania aplikacji.
- [ ] Breadcrumb pokazuje kontekst (strona/szablon/wpis) z odpowiednią ikoną.
- [ ] Przycisk publikacji i status zależne od trybu.
- [ ] Statusy Live/Robocza/Ukryta spójne w drzewie, modalu i prawym panelu.
- [ ] Wszystkie nowe teksty w i18n (PL + EN fallback).
- [ ] QA smoke: strona → szablon → modal → wpis → powrót, na desktop i mobile.

## 7. Testy

### E2E (Playwright) — smoke
- [ ] Otwarcie buildera → Strony → kolekcja „Wpis na blogu" rozwinięta.
- [ ] „Wszystkie wpisy" → modal z tabelą → klik wiersza → tryb treści (DND off).
- [ ] „+ Nowy wpis" → kafelki → nowy post otwarty w trybie treści.
- [ ] „Szablon: Klasyczny" → tryb szablonu (DND on) → zmiana layoutu zapisana.

### Manualne QA
- [ ] Inline editing na desktop i mobile.
- [ ] Zmiana szablonu w locie bez utraty treści.
- [ ] Statusy spójne we wszystkich widokach.
- [ ] Breadcrumb poprawny we wszystkich 3 trybach.

## 8. Pliki

| Plik | Akcja |
|------|-------|
| `packages/chaibuilder-sdk/src/hooks/use-editor-mode.ts` | **Zmiana** — finalizacja atomu + helpery |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | **Zmiana** — centralny switch + modal |
| `packages/chaibuilder-sdk/src/pages/extensions/topbar.tsx` | **Zmiana** — breadcrumb + publikacja wg trybu |
| `packages/chaibuilder-sdk/src/core/locales/en.json` | **Zmiana** — nowe klucze |
| `src/app/(builder)/editor/pl.json` | **Zmiana** — tłumaczenia PL |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | **Zmiana** — polish stanów |

## 9. Szacowany nakład

2–3h — integracja, breadcrumb, statusy, i18n, QA smoke.
