"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  Calendar,
  ChevronsDownUp,
  Columns2,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  Mail,
  Minus,
  MousePointerClick,
  Star,
  Tag,
  Type,
} from "lucide-react"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ConfirmationModal,
  RenderFields,
  useFormFields,
  useForm,
  useModal,
  Button,
} from "@payloadcms/ui"
import type { BlocksFieldClientComponent, ClientBlock } from "payload"

import { getBlockAccess } from "../get-granted-block-keys"

const ICON_SIZE = 14

const BLOCK_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  grid: LayoutGrid,
  column: Columns2,
  text: Type,
  button: MousePointerClick,
  image: ImageIcon,
  separator: Minus,
  accordion: ChevronsDownUp,
  hero_section: Star,
  pricing_table: Tag,
  contact_form: Mail,
  schedule_grid: Calendar,
}

type BreadcrumbEntry = {
  slug: string
  label: string
}

type BreadcrumbContextValue = {
  path: BreadcrumbEntry[]
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  path: [],
})

function Breadcrumb({ path, currentLabel }: { path: BreadcrumbEntry[]; currentLabel: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
      {path.map((entry, i) => (
        <span key={entry.slug} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          {i > 0 && <span style={{ margin: "0 0.125rem", opacity: 0.4 }}>›</span>}
          <span style={{ color: "var(--theme-elevation-400)" }}>{entry.label}</span>
        </span>
      ))}
      {path.length > 0 && <span style={{ margin: "0 0.125rem", opacity: 0.4 }}>›</span>}
      <span style={{ fontWeight: 600 }}>{currentLabel}</span>
    </span>
  )
}

function SortableRow({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{
            background: "none",
            border: "none",
            cursor: "grab",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
            color: "var(--theme-elevation-400)",
            flexShrink: 0,
            touchAction: "none",
          }}
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

function blockLabel(block: ClientBlock): string {
  const s = block.labels?.singular
  if (typeof s === "string") return s
  return block.slug
}

export const BlocksField: BlocksFieldClientComponent = (props) => {
  const { field, path, permissions, readOnly, schemaPath: schemaPathFromProps } = props
  const schemaPath = schemaPathFromProps ?? field.name
  const blocks: ClientBlock[] = (field.blocks ?? []) as ClientBlock[]

  /* ── Hooks: must be called before any useCallback that references them ── */
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const DELETE_MODAL_SLUG = `delete-block-${path.replace(/\./g, "-")}`
  const { openModal, closeModal } = useModal()

  const { addFieldRow, dispatchFields, getDataByPath, moveFieldRow, removeFieldRow } = useForm()

  const formFields = useFormFields(([fields]) => fields)
  const fieldState = formFields[path] as
    | { rows?: { id: string; blockType?: string }[]; value?: unknown[] }
    | undefined
  const rows = fieldState?.rows ?? []

  const { path: breadcrumbPath } = useContext(BreadcrumbContext)

  const [blockAccess, setBlockAccess] = useState<{
    granted: string[]
    customKeys: string[]
  } | null>(null)

  useEffect(() => {
    getBlockAccess().then(setBlockAccess).catch(() => setBlockAccess(null))
  }, [])

  /* ── Derived state (depends on hooks above) ── */
  const editingRow = editingRowIndex !== null ? rows[editingRowIndex] : null
  const editingBlock = editingRow
    ? blocks.find((b) => b.slug === editingRow.blockType)
    : null

  const fieldLabel = String(field.label ?? field.name)

  /* ── Callbacks (hook return values are now in scope) ── */
  const handleDeleteConfirm = useCallback(() => {
    if (pendingDeleteIndex !== null) {
      removeFieldRow({ path, rowIndex: pendingDeleteIndex })
    }
    setPendingDeleteIndex(null)
    closeModal(DELETE_MODAL_SLUG)
  }, [pendingDeleteIndex, removeFieldRow, path, closeModal, DELETE_MODAL_SLUG])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = rows.findIndex((r) => r.id === active.id)
      const newIndex = rows.findIndex((r) => r.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      moveFieldRow({ moveFromIndex: oldIndex, moveToIndex: newIndex, path })
    },
    [rows, moveFieldRow, path],
  )

  const isCustomBlock = (slug: string): boolean =>
    blockAccess?.customKeys.includes(slug) ?? false
  const canAddBlock = (slug: string): boolean =>
    !isCustomBlock(slug) || (blockAccess?.granted.includes(slug) ?? true)

  if (editingRow && editingBlock && editingRowIndex !== null) {
    const currentLabel = `${blockLabel(editingBlock)} #${editingRowIndex + 1}`
    const fullPath = [...breadcrumbPath, { slug: editingBlock.slug, label: currentLabel }]

    return (
      <div
        className="field-type blocks-field"
        style={{
          border: "1px solid var(--theme-elevation-200)",
          padding: "1rem",
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.8125rem",
            color: "var(--theme-elevation-500)",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setEditingRowIndex(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--theme-elevation-400)",
              padding: "0.125rem 0.25rem",
              borderRadius: "3px",
              fontSize: "0.8125rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.125rem",
              marginRight: "0.25rem",
            }}
          >
            ←
          </button>
          <Breadcrumb path={breadcrumbPath} currentLabel={currentLabel} />
        </div>
        <BreadcrumbContext.Provider value={{ path: fullPath }}>
          <RenderFields
            fields={editingBlock.fields}
            parentPath={`${path}.${editingRowIndex}`}
            parentSchemaPath={`${schemaPath}${editingBlock.slug}`}
            parentIndexPath={String(editingRowIndex)}
            permissions={permissions ?? {}}
            readOnly={readOnly}
          />
        </BreadcrumbContext.Provider>
      </div>
    )
  }

  return (
    <div
      className="field-type blocks-field"
      style={{
        border: "1px solid var(--theme-elevation-200)",
        padding: "1rem",
        borderRadius: "4px",
      }}
    >
      <header style={{ marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontWeight: 400, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--theme-elevation-500)" }}>
          <Breadcrumb path={breadcrumbPath} currentLabel={fieldLabel} />
        </h3>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rows.length === 0 && (
              <div
                style={{
                  padding: "1rem",
                  textAlign: "center",
                  color: "var(--theme-elevation-400)",
                  fontSize: "0.875rem",
                }}
              >
                No blocks added yet
              </div>
            )}
            {rows.map((row, i) => {
              const block = blocks.find((b) => b.slug === row.blockType)
              const isActive = editingRowIndex === i
              const isHidden = getDataByPath(`${path}.${i}.hidden`) as boolean | undefined
              const IconComponent = block ? BLOCK_ICONS[block.slug] : undefined
              return (
                <SortableRow key={row.id} id={row.id}>
                  <div
                    onClick={() => setEditingRowIndex(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.5rem 0.5rem 0.25rem",
                      background: isActive
                        ? "var(--theme-elevation-100)"
                        : isHidden
                          ? "var(--theme-elevation-0)"
                          : "var(--theme-elevation-50)",
                      borderRadius: "4px",
                      borderLeft: isActive
                        ? "3px solid var(--brand-accent-600, var(--theme-elevation-500))"
                        : "3px solid transparent",
                      cursor: "pointer",
                      opacity: isHidden ? 0.5 : 1,
                      transition: "background 0.1s, border-color 0.1s, opacity 0.1s",
                    }}
                  >
                    {IconComponent && (
                      <IconComponent
                        size={ICON_SIZE}
                        style={{ flexShrink: 0, opacity: 0.5 }}
                      />
                    )}
                    <span style={{ flex: 1, fontWeight: 500 }}>
                      {block ? blockLabel(block) : "Unknown"} #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const current = getDataByPath(`${path}.${i}.hidden`) as boolean | undefined
                        dispatchFields({
                          type: "UPDATE",
                          path: `${path}.${i}.hidden`,
                          value: !current,
                        } as any)
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: isHidden ? "var(--theme-elevation-600)" : "var(--theme-elevation-400)",
                        padding: "0.125rem",
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                      aria-label="Toggle visibility"
                    >
                      {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDeleteIndex(i)
                        openModal(DELETE_MODAL_SLUG)
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--theme-error-500)",
                        fontSize: "1rem",
                        padding: "0.125rem",
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </SortableRow>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length > 0 && (
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          {blocks.filter((b) => canAddBlock(b.slug)).map((block) => (
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

      <ConfirmationModal
        modalSlug={DELETE_MODAL_SLUG}
        heading="Usuń blok"
        body="Czy na pewno chcesz usunąć ten blok? Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteIndex(null)}
      />
    </div>
  )
}
