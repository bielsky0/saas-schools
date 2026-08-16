# Shopify Tree — Specyfikacja wyglądu i mapowanie na ChaiBuilder

Źródło: zrzut computed styles + CSS rules z edytora Shopify (Polaris + Online-Store-UI),
Online Store 2.0. Wartości potwierdzone przez `getComputedStyle` i tokeny `--p-*`.

Celem tego dokumentu jest jedno miejsce prawdy dla wyglądu drzewka struktury w lewym
panelu edytora. Gdy wkleisz HTML kolejnych sekcji Shopify, mapuj go zgodnie z §5–§6.

## 1. Tokeny kolorów

| Polaris token | Wartość | Hex | Rola w drzewie |
|---|---|---|---|
| `--p-color-bg-surface` | 255,255,255 | `#FFFFFF` | tło panelu, tekst na selected |
| `--p-color-bg-surface-hover` | 247,247,247 | `#F7F7F7` | hover powierzchni |
| `--p-color-bg-surface-active` | 243,243,243 | `#F3F3F3` | active |
| `--p-color-bg-surface-brand-selected` | 241,241,241 | `#F1F1F1` | **hover wiersza (nieselekcjonowany)** |
| `--p-color-bg-fill-highlight` | 0,91,211 | `#005BD3` | **selected (solid)** + akcent + „Dodaj…" |
| `--p-color-bg-fill-transparent-secondary` | 0,0,0,.06 | `black/6%` | hover przycisków/ikon |
| `--p-color-text` | 48,48,48 | `#303030` | tekst główny |
| `--p-color-text-brand` | 74,74,74 | `#4A4A4A` | tekst w hoverze linków |
| `--p-color-icon` | 74,74,74 | `#4A4A4A` | ikony (strzałka, drag) |
| `--p-color-icon-hover` | 48,48,48 | `#303030` | ikony hover |
| `--p-color-bg-surface-secondary-active` | 235,235,235 | `#EBEBEB` | divider / separator |
| `--p-color-bg-surface-tertiary` | 243,243,243 | `#F3F3F3` | active akcji |
| `--p-border-radius-200` | .5rem | `8px` | promień wiersza/przycisków |

Dodatkowe (computed, poza tokenami):
- Tekst podrzędny (podtytuł sekcji): `#616161`.
- Hover „+" (add button): `#3F86F2`.

## 2. Typografia

Font: `Inter, -apple-system, system-ui, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif`.

| Element | size | weight | line-height | color | inne |
|---|---|---|---|---|---|
| Panel (baza) | 13px | 450 | 20px | #303030 | — |
| Nagłówek grupy (`h3 headingSm`) | 13px | **600** | 20px | #303030 | **normal case**, bez letter-spacing |
| Tytuł sekcji/bloku (`bodySm`) | **12px** | 450 | 16px | #303030 | truncate |
| Podtytuł (`bodySm subdued`) | 12px | 450 | 16px | #616161 | — |
| „Dodaj sekcję"/„Dodaj blok" | 12px | 450 | 16px | **#005BD3** | — |

## 3. Struktura DOM

```
Panel (bg #fff, radius 12px, cień, padding-left 4px)
├─ Header (sticky): tytuł strony "Strona główna" (14px/600) + divider #EBEBEB
├─ ScrollContainer
│  └─ Layout (flex column)
│     └─ dla każdej grupy (Nagłówek / Szablon / Stopka):
│        ├─ LabelWrapper (padding 4px 4px 4px 12px, height 28px, flex space-between)
│        │  └─ h3 (headingSm) — nazwa grupy
│        └─ ol.SortableList (bg #fff, flex column, padding-bottom 8px)
│           ├─ li.AddBetweenButton  ← kółko "+" (16px, bg #005BD3, radius 50%, biały plus, opacity 0→hover)
│           ├─ li.NavItem (margin 0 8px, height 30px)          ← sekcja
│           │  └─ Interior (radius 8px)
│           │     ├─ PrimaryAction (button)
│           │     │  ├─ Disclosure (strzałka, #4A4A4A)
│           │     │  ├─ DragHandle (6 kropek)
│           │     │  ├─ TitleContent (title + opcjonalny subtitle "– …")
│           │     │  └─ Suffix (ikony: ukryj/usuń/…, opacity 0→hover)
│           │  └─ nested ol.SortableList (padding-left 16px)    ← bloki sekcji
│           │     └─ li.NavItem--nested (blok) …
│           └─ li.NavItem--interactive ("Dodaj sekcję", #005BD3)
```

## 4. Stany

| Stan | Background | Tekst/ikony |
|---|---|---|
| Default | transparent | #303030 |
| Hover | `#F1F1F1` (`bg-surface-brand-selected`) | #303030 |
| Selected | `#005BD3` (`bg-fill-highlight`) | **#FFFFFF** |
| Selected + hover | `#005BD3` | #FFFFFF |
| Active (przycisk/ikona) | `#F3F3F3` / `black/6%` | #005BD3 |

- Ikony akcji (drag, ukryj, usuń, „…"): `opacity 0` → `opacity 1` na hover wiersza (klasa `group-hover`).
- „+" między sekcjami: kółko, widoczne dopiero na hover wiersza powyżej/poniżej.

## 5. Mapowanie na ChaiBuilder (komponenty)

| Shopify | ChaiBuilder | Plik |
|---|---|---|
| Panel + Header | `BuilderLeftPanel` | `builder-left-panel.tsx` |
| Grupa (Header/Template/Footer) | `SectionGroup` (z `groupSections`) | `section-groups.ts` |
| `LabelWrapper + h3` | `GroupHeader` | `sections-tab.tsx` |
| `ol.SortableList` + `li.NavItem` (sekcja) | `SectionTree` + `Node` (level 0) | `section-tree.tsx` / `node.tsx` |
| `li.NavItem--nested` (blok) | `Node` (level > 0, wcięcie) | `node.tsx` |
| `AddBetweenButton` ("+") | strefy „add" między węzłami | `node.tsx` / `list-tree.tsx` |
| `NavItem--interactive` „Dodaj sekcję" | link na końcu grupy | `sections-tab.tsx` |
| „Dodaj blok" | przycisk przy węźle z blokami | `node.tsx` |

## 6. Zasady tłumaczenia dowolnego HTML Shopify → ChaiBuilder

1. **`Online-Store-UI-NavItem`** = węzeł drzewa (sekcja lub blok). `--nested` → poziom > 0 (wcięcie).
2. **`AddBetweenButton`** = separator „+" do wstawienia elementu (nie węzeł).
3. **`NavItem--interactive`** z tekstem „Dodaj…" = link akcji, nie węzeł.
4. **`_LabelWrapper > h3`** = nagłówek grupy (nie węzeł, nie klikalny).
5. **Kolory**: zawsze przez tokeny z §1 (akcent to `#005BD3`, NIE `#006bff`).
6. **Stany**: `--selected` → `bg #005BD3 + white`; `:hover` → `bg #F1F1F1`; `:active` → `bg #F3F3F3`.
7. **Ikony** pojawiają się na hover (`opacity-0 group-hover:opacity-100`), kolor bazowy `#4A4A4A` → hover `#303030`.
8. **Promień** elementów interaktywnych = `8px` (`rounded-lg`).
9. **Wysokość wiersza** = 30px (`h-[30px]`), nagłówek grupy = 28px.

## 7. Tokeny ChaiBuilder (odbicie w `shopify-tokens.css`)

Komponenty drzewa używają literalnych hexów (spójnie z resztą `node.tsx`), ale tokeny
`--chai-*` w `shopify-tokens.css` są kanonicznym miejscem przechowywania tych wartości:

- `--chai-accent-blue: #005BD3` (akcent + selected)
- `--chai-accent-blue-hover: #3F86F2`
- `--chai-text-hex: #303030`
- `--chai-text-subdued-hex: #616161`
- `--chai-surface-hover-hex: #F1F1F1`
- `--chai-surface-active-hex: #F3F3F3`
- `--chai-icon-hex: #4A4A4A`
- `--chai-border-divider: #EBEBEB`
