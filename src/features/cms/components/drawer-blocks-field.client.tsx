"use client"

import { createContext, useContext, useState } from "react"
import {
  Drawer,
  DrawerToggler,
  useDrawerSlug,
  RenderFields,
  useFormFields,
  useForm,
  Button,
} from "@payloadcms/ui"
import type { BlocksFieldClientComponent, ClientBlock } from "payload"

type BreadcrumbContextValue = {
  parentBlock: { slug: string; label: string } | null
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  parentBlock: null,
})

function blockLabel(block: ClientBlock): string {
  const s = block.labels?.singular
  if (typeof s === "string") return s
  return block.slug
}

export const DrawerBlocksField: BlocksFieldClientComponent = (props) => {
  const { field, path, permissions, readOnly, schemaPath: schemaPathFromProps } = props
  const schemaPath = schemaPathFromProps ?? field.name
  const blocks: ClientBlock[] = (field.blocks ?? []) as ClientBlock[]

  const drawerSlug = useDrawerSlug("edit-block-drawer")
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)

  const { addFieldRow, removeFieldRow } = useForm()

  const formFields = useFormFields(([fields]) => fields)
  const fieldState = formFields[path] as
    | { rows?: { id: string; blockType?: string }[]; value?: unknown[] }
    | undefined
  const rows = fieldState?.rows ?? []

  const editingRow = editingRowIndex !== null ? rows[editingRowIndex] : null
  const editingBlock = editingRow
    ? blocks.find((b) => b.slug === editingRow.blockType)
    : null

  const { parentBlock } = useContext(BreadcrumbContext)

  return (
    <div
      className="field-type blocks-field"
      style={{ border: "1px solid var(--theme-elevation-200)", padding: "1rem", borderRadius: "4px" }}
    >
      <header style={{ marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>
          {parentBlock ? `${parentBlock.label} › ` : ""}
          {String(field.label ?? field.name)}
        </h3>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map((row, i) => {
          const block = blocks.find((b) => b.slug === row.blockType)
          return (
            <div
              key={row.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                background: "var(--theme-elevation-50)",
                borderRadius: "4px",
              }}
            >
              <span style={{ flex: 1, fontWeight: 500 }}>
                {block ? blockLabel(block) : "Unknown"} #{i + 1}
              </span>
              <DrawerToggler
                slug={drawerSlug}
                onClick={() => setEditingRowIndex(i)}
              >
                <Button buttonStyle="secondary" size="small" el="span">
                  Edit
                </Button>
              </DrawerToggler>
              <button
                type="button"
                onClick={() => removeFieldRow({ path, rowIndex: i })}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--theme-error-500)",
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {blocks.length > 0 && (
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          {blocks.map((block) => (
            <Button
              key={block.slug}
              buttonStyle="icon-label"
              icon="plus"
              size="small"
              onClick={() =>
                addFieldRow({
                  blockType: block.slug,
                  path,
                  rowIndex: rows.length,
                  schemaPath,
                })
              }
            >
              Add {blockLabel(block)}
            </Button>
          ))}
        </div>
      )}

      <Drawer slug={drawerSlug} title={`Edit ${editingBlock ? blockLabel(editingBlock) : ""}`}>
        {editingRow && editingBlock && editingRowIndex !== null && (
          <BreadcrumbContext.Provider
            value={{
              parentBlock: {
                slug: editingBlock.slug,
                label: blockLabel(editingBlock),
              },
            }}
          >
            {parentBlock && (
              <div
                style={{
                  padding: "0.5rem 1rem",
                  marginBottom: "0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--theme-elevation-500)",
                  borderBottom: "1px solid var(--theme-elevation-200)",
                }}
              >
                ← {parentBlock.label}
              </div>
            )}
            <RenderFields
              fields={editingBlock.fields}
              parentPath={`${path}.${editingRowIndex}`}
              parentSchemaPath={`${schemaPath}${editingBlock.slug}`}
              parentIndexPath={String(editingRowIndex)}
              permissions={permissions ?? {}}
              readOnly={readOnly}
            />
          </BreadcrumbContext.Provider>
        )}
      </Drawer>
    </div>
  )
}
