"use client"

import { useRowLabel } from "@payloadcms/ui"

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function extractLexicalPreview(content: unknown, maxLen = 40): string {
  if (!isPlainObject(content)) return ""
  const root = content.root
  if (!isPlainObject(root)) return ""
  const blocks = root.children
  if (!Array.isArray(blocks)) return ""

  let text = ""
  for (const block of blocks) {
    if (!isPlainObject(block)) continue
    const children = block.children
    if (!Array.isArray(children)) continue
    for (const node of children) {
      if (!isPlainObject(node)) continue
      if (node.type === "text" && typeof node.text === "string") {
        text += node.text
      } else if (node.type === "linebreak") {
        text += " "
      } else if (node.type === "link" && Array.isArray(node.children)) {
        for (const linkChild of node.children) {
          if (
            isPlainObject(linkChild) &&
            linkChild.type === "text" &&
            typeof linkChild.text === "string"
          ) {
            text += linkChild.text
          }
        }
      }
    }
    text += " "
  }

  text = text.replace(/\s+/g, " ").trim()
  if (!text) return ""
  if (text.length > maxLen) return text.slice(0, maxLen) + "\u2026"
  return text
}

export function RowLabel() {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const rowData = (data ?? {}) as Record<string, unknown>
  const blockType = (rowData.blockType as string) ?? ""

  switch (blockType) {
    case "grid": {
      const cols = rowData.columns as number | undefined
      return <span>Siatka ({cols ?? "?"} kol.)</span>
    }

    case "column":
      return <span>Kolumna</span>

    case "text": {
      const preview = extractLexicalPreview(rowData.content)
      return <span>{preview ? `Tekst: "${preview}"` : `Tekst`}</span>
    }

    case "button": {
      const label = (rowData.label as string)?.trim()
      return <span>{label || "Przycisk"}</span>
    }

    case "image": {
      const alt = (rowData.alt as string)?.trim()
      const caption = (rowData.caption as string)?.trim()
      const desc = alt || caption
      return <span>{desc ? `Obraz: ${desc}` : "Obraz"}</span>
    }

    case "separator":
      return <span>Separator</span>

    case "accordion": {
      const items = rowData.items as unknown[] | undefined
      const count = Array.isArray(items) ? items.length : 0
      return <span>Akordeon ({count} elem.)</span>
    }

    case "hero_section": {
      const title = (rowData.title as string)?.trim()
      return <span>{title || "Hero Section"}</span>
    }

    case "pricing_table": {
      const title = (rowData.title as string)?.trim()
      return <span>{title || "Tabela cenowa"}</span>
    }

    case "contact_form": {
      const title = (rowData.title as string)?.trim()
      return <span>{title || "Formularz kontaktowy"}</span>
    }

    case "schedule_grid": {
      const title = (rowData.title as string)?.trim()
      return <span>{title || "Grafik zajęć"}</span>
    }

    default:
      return <span>{blockType || "Blok"}</span>
  }
}
