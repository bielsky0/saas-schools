# Faza 7: Przebudowa lewego panelu + AI drawer (Shopify-style builder)

> Status: **plan** — zatwierdzony 2026-08-03.
>
> Postęp: **F7.1 ✅, F7.2 ✅** (2026-08-03) — szczegóły w `README.md`.
> Zostało: F7.3 (usunięcie prawego panelu), F7.4 (AI drawer), F7.5 (resize), F7.6 (testy/i18n).
>
> Decyzje użytkownika (2026-08-03):
> 1. **Kolejność: lewy panel NA KOŃCU** — po blog CMS (F5.0–F5.4). Blog CMS pracuje na
>    obecnym layoucie, potem przebudowa przenosi wszystko do lewego panelu.
> 2. **AI panel wysuwa się z prawej strony** (drawer/overlay nad canvasem) jak w Shopify.
>    Przycisk otwierający chat AI jest w **topbarze** (referencja: `Zrzut ekranu 2026-08-3 o 11.17.02.png`).
> 3. Cała edycja (blok, strona, szablon) w **lewym panelu** — prawy panel stały znika.

## 1. Cel

Zamiana stałego prawego panelu (280px) na model Shopify: wszystkie ustawienia trafiają do
lewego panelu (dolny wysuwany panel), a jedyną rzeczą wysuwającą się z prawej jest **chat AI**
jako nakładka. Canvas dostaje pełną szerokość.

```
PRZED:
[Left 300px] [Canvas flex-1] [Right 280px — blok/strona/szablon/AI]

PO:
[Left 320-500px ⇄ resizable] [Canvas fill]        [AI drawer ← wysuwany on demand]
 ┌ Tabs (Sections/Theme/Pages)                    ┌───────────────────────────┐
 ├ Tab content (shrinks gdy block wybrany)        │ ← Back   Ask AI           │
 ├──── resize handle ────                         │                           │
 ├ ← Block Name [Content|Styling|Advanced]        │ [AskAI chat]              │
 └ Settings panel (slide-up)                      └───────────────────────────┘
                                                  (overlay, nie zajmuje layoutu)
```

## 2. Sub-fazy

### 7.1 — Block settings w lewym panelu (bottom slide-up)

> ✅ Zrealizowane 2026-08-03.

- `builder-left-panel.tsx`: struktura z dolnym panelem.
- Gdy blok wybrany → `SettingsPanel` (Content/Styling/Advanced) wysuwa się z dołu, góra się kurczy.
- Back button (←) odznacza blok.
- `SettingsPanel` / `BlockSettings` / `BlockStyling` czytają globalne atomy Jotai
  (`useSelectedBlock`, `useSelectedStylingBlocks`) — działają w dowolnym miejscu drzewa.

### 7.2 — Page / Template settings w lewym panelu

> ✅ Zrealizowane 2026-08-03.

- `PageSettings`, `TemplateSettings`, `ThemeEditor` renderują się w dolnym panelu wg kontekstu:
  - `editorContext.type === "page"` + brak bloku → `PageSettings`
  - `editorContext.type === "template"` + brak bloku → `TemplateSettings`
  - blok wybrany → `SettingsPanel`
  - nic → panel ukryty (góra pełna wysokość)
- Eliminuje `rightPanelAtom` dla page/template (kontekst już jest w `editorContextAtom`).

### 7.3 — Usunięcie prawego panelu

- `builder-layout.tsx`: usunąć `<div id="right-panel">` (280px).
- Canvas automatycznie wypełnia przestrzeń.
- `rightPanelAtom` stopniowo zastępowany przez `editorContextAtom` + `useSelectedBlock`.

### 7.4 — AI drawer z prawej + przycisk w topbarze

- **Przycisk AI w topbarze** (chat icon) — otwiera/zamyka drawer.
- **Drawer**: wysuwany z prawej krawędzi nad canvasem (overlay, `fixed right-0 top-0 h-full`),
  szerokość ~360-400px, animacja slide-in z prawej (shadcn `Sheet`/Drawer).
- Renderuje `AskAI`.
- Nie zajmuje layoutu — canvas nie zmienia szerokości przy otwarciu (jak Shopify).
- Zamknięcie: back button, klik poza, ESC.

### 7.5 — Resize lewego panelu

- `react-resizable-panels` (jeśli w zależnościach) lub własny resize handle.
- Zakres ~320-500px.

### 7.6 — Testy / i18n / animacje

- i18n dla nowych kluczy (Content, Styling, Advanced, Ask AI, AI placeholder itd.).
- Animacje slide-up / slide-in (shadcn).
- Mobile (`MobileBuilderLayout`) — bez zmian, ma własny układ.

## 3. Kluczowe pliki

| Plik | Zmiana |
|------|--------|
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/builder-left-panel.tsx` | Nowa struktura z dolnym panelem |
| `packages/chaibuilder-sdk/src/pages/client/layouts/builder-layout.tsx` | Usunięcie prawego panelu; topbar button AI; AI drawer |
| `packages/chaibuilder-sdk/src/pages/client/layouts/right-panel/*` | Komponenty przeniesione do lewego panelu (importy) |
| `packages/chaibuilder-sdk/src/hooks/use-theme.ts` | `rightPanelAtom` → stopniowo zastępowany |
| `packages/chaibuilder-sdk/src/pages/client/layouts/topbar/builder-top-bar.tsx` | Przycisk AI chat |
| `packages/chaibuilder-sdk/src/pages/client/layouts/left-panel/theme-tab.tsx` | ThemeEditor w dolnym panelu |

## 4. Szacowany nakład

| Sub-faza | Nakład |
|----------|--------|
| 7.1 Block settings w lewym | 4h |
| 7.2 Page/Template w lewym | 2h |
| 7.3 Usunięcie prawego panelu | 1h |
| 7.4 AI drawer + topbar button | 2-3h |
| 7.5 Resize lewego panelu | 1h |
| 7.6 Testy / i18n / animacje | 2h |
| **Łącznie** | **~12-14h** |

## 5. Kolejność w projekcie

```
F5.0 Cleanup  →  F5.1 Dashboard Blog  →  F5.2 Bloki blogowe  →  F5.3 Podgląd posta
 →  F5.4 Strona bloga  →  F7 Przebudowa lewego panelu + AI drawer  →  F5.5 (future)
```

F7 na samym końcu — blog CMS najpierw na obecnym layoucie, potem przenoszenie do lewego panelu.
