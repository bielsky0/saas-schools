# Moduł bloga i szablonów CMS — plan implementacji

> Źródła speca:
> - Wireframe: `docs/Blog i szablony.dc.html`
> - Specyfikacja UX/UI: „Zakładka Strony, Szablony i Moduł Bloga (Builder)"
>
> Każda faza = osobna sesja. Wpisuj postęp/odchyłki przy każdej fazie.

## 1. Cel

Dodać do buildera ChaiBuilder pełny moduł CMS: **kolekcje w drzewie lewego panelu** (STRONY / SZABLONY (KOLEKCJE CMS) / SYSTEMOWE), **modal listy wpisów** (overlay nad canvasem), **edycję layoutu szablonu** (drag & drop, dziedziczona przez posty) oraz **tryb edycji treści wpisu** (inline editing, układ zablokowany).

Kluczowe założenie: ochrona interfejsu buildera — zarządzanie listą postów odbywa się przez **Modal (nakładkę)**, a nie przez zmianę głównego widoku roboczego.

## 2. Utrwalone decyzje

- **Zmiany SDK** bezpośrednio w `packages/chaibuilder-sdk/` (fork), bez PR do upstream.
- **Kolekcje CMS zdefiniowane w kodzie** (config mapujący `pageType` → nazwa kolekcji + lista szablonów). Bez osobnej tabeli i bez UI zarządzania kolekcjami.
- **Pełne wyłączenie DND** w trybie edycji treści — nowa flaga `editorMode: "layout" | "content"` w SDK (nie obejście na poziomie bloków).
- Szablony layoutu to **strony** (`pageType: "blog_post_template"` itp.) powiązane z postami przez nową kolumnę `page.templateId`.
- UI po polsku, fallback EN (i18n), zgodnie z `docs/editor-spec-implementation-plan.md`.
- Cykl pracy: zmiany w `packages/chaibuilder-sdk/src/` → `pnpm --filter @chaibuilder/sdk build` → `pnpm dev`.

## 3. Graficzny plan faz

```
Faza 1 ─── Backend: model danych (templateId) + API + config kolekcji
   │
Faza 2 ─── Lewy panel: drzewo kolekcji CMS (rozwijane listy)
   │
Faza 3 ─── Modal "Lista wpisów" + krok wyboru szablonu
   │
Faza 4 ─── Tryb edycji szablonu (layout, DND, mapowanie danych, SEO)
   │
Faza 5 ─── Tryb edycji treści wpisu (inline editing, układ zablokowany)
   │
Faza 6 ─── Integracja (editorMode atom, nawigacja, breadcrumb, statusy, polish)
```

Zależności: F2 i F3 zależą od F1; F4 i F5 zależą od F2 (wyzwalacz w drzewie) oraz od F1 (dane szablonu/postu); F6 zależy od F4+F5.

## 4. Mapowanie spec → faza

| Wymóg speca | Faza |
|---|---|
| STRONY z wskaźnikiem statusu (Live/Robocza/Ukryta) | F2, F6 |
| SZABLONY (KOLEKCJE CMS) jako rozwijane listy (kolekcja → „Wszystkie wpisy" + warianty szablonów) | F2 |
| Klik „Wszystkie wpisy" → otwiera bazę postów (bez zmiany widoku roboczego) | F3 |
| Klik „Szablon: X" → edytor layoutu z DND + placeholderami | F4 |
| Prawy panel szablonu: Układ, Elementy, Mapowanie danych, Domyślne SEO | F4 |
| Modal „Zarządzaj wpisami: Blog" (search, filtr szkiców, tabela, [+ Nowy wpis]) | F3 |
| Ścieżka A: „+ Nowy wpis" → krok wyboru szablonu (kafelki) → zamknięcie modala | F3 |
| Ścieżka B: klik wiersza → zamknięcie modala → tryb edycji treści | F3, F5 |
| Tryb edycji treści: Live Preview, brak DND, inline editing | F5 |
| Prawy panel posta: tytuł, slug, kategorie/tagi, thumbnail, zajawka, dropdown szablonu, status | F5 |
| Przełącznik statusu: Zapisz jako szkic / Opublikuj | F5, F1 |
| Breadcrumb w topbarze (Strona / Szablon / Wpis) | F6 |

## 5. Szacowany nakład

| Faza | Nakład |
|---|---|
| F1 Backend | 3–4h |
| F2 Lewy panel | 3–4h |
| F3 Modal | 3–4h |
| F4 Edycja szablonu | 4–5h |
| F5 Inline editing | 4–5h |
| F6 Integracja | 2–3h |
| **Łącznie** | **~19–25h** |

## 6. Kluczowe pliki (referencje)

| Plik | Rola |
|------|------|
| `src/lib/db/schema/pages.ts` | Tabela `page` — dodanie `templateId` |
| `src/app/(builder)/editor/api/route.ts` | API buildera — nowe akcje kolekcji/szablonów |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/pages-tab.tsx` | Zakładka Strony w lewym panelu |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/page-groups.ts` | Grupowanie STRONY/SZABLONY/SYSTEMOWE |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | Kompozycja lewy panel + canvas + prawy panel |
| `packages/chaibuilder-sdk/src/hooks/use-theme.ts` | `rightPanelAtom` — dodanie trybów `template`/`post` |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/page-settings.tsx` | Wzorzec prawego panelu strony |
| `packages/chaibuilder-sdk/src/pages/client/components/page-manager/` | Komponenty drzewa stron |
| `packages/chaibuilder-sdk/src/core/components/canvas/` | Canvas + system DND |
| `src/lib/blocks-library.ts` | Biblioteka szablonów (5 blogowych) |
| `src/lib/block-data.ts` | Dane bloga (`getBlogPosts`, `getBlogPostBySlug`) |

## 7. Postęp implementacji

> Zasada: wpisuj postęp/odchyłki przy każdej zakończonej fazie.

| Faza | Status | Data | Odchyłki / notatki |
|------|--------|------|--------------------|
| F0 — Audyt | ✅ | 2026-08-02 | 9 plików zweryfikowanych — stan zgodny z dokumentacją |
| F1 — Backend | ✅ | 2026-08-02 | **Brak FK** na `templateId` (patrz niżej); szablony-pages tworzone leniwie |
| F2 — Lewy panel | ⬜ | — | — |
| F3 — Modal | ⬜ | — | — |
| F4 — Edycja szablonu | ⬜ | — | — |
| F5 — Inline editing | ⬜ | — | — |
| F6 — Integracja | ⬜ | — | — |

### Odchyłki F1

1. **`page.templateId` bez FK do `page(id)`.** Spec zakładał `REFERENCES page(id) ON DELETE SET NULL`, ale wartością kolumny jest **klucz szablonu z `CMS_COLLECTIONS`** (np. `"tpl-blog-classic"`), a nie `page.id`:
   - klucze są współdzielone między tenantami, a `page.id` to UUID — szablon-podstrona (pageType `*_template`) powstaje **leniwie, per organizacja** (dopiero w F4 / `UPDATE_TEMPLATE`);
   - globalny FK zablokowałby `CREATE_COLLECTION_ITEM` zanim jakakolwiek strona-szablon istnieje.
   - Spójność wymuszamy na warstwie API: walidacja `templateId` przeciw `CMS_COLLECTIONS` w tej samej transakcji tenanta. Migracja dodaje zwykły indeks `page_template_id_idx`.
2. **Szablon-strona identyfikowany przez `(organizationId, pageType = *_template, slug = klucz szablonu)`** — nie przez `page.id`. `GET_TEMPLATE_DATA` szuka takiej strony; gdy nie istnieje, zwraca `page: null` + domyślny config z `getDefaultTemplateConfig()`. `UPDATE_TEMPLATE` tworzy ją lazily.
3. **Testy API** (`LIST_COLLECTION_ITEMS`, `CREATE_COLLECTION_ITEM`) — wyłącznie manualne QA (dotykają DB, poza zakresem Vitest). Vitest pokrywa config `CMS_COLLECTIONS` + czyste helpery.
