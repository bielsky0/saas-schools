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
  Plus,
  Star,
  Tag,
  Trash2,
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
import { RenderFields, useFormFields, useForm } from "@payloadcms/ui"
import type { BlocksFieldClientComponent, ClientBlock } from "payload"

import { cn } from "@/lib/utils"
import { Button } from "@/features/cms/admin/components/ui/button"
import { Card, CardContent } from "@/features/cms/admin/components/ui/card"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/features/cms/admin/components/ui/alert-dialog"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/features/cms/admin/components/ui/command"

import { getBlockAccess } from "../get-granted-block-keys"

const ICON_SIZE = 14

const BLOCK_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
    <span className="inline-flex items-center gap-1 flex-wrap text-muted-foreground text-xs">
      {path.map((entry, i) => (
        <span key={entry.slug} className="inline-flex items-center gap-1">
          {i > 0 && <span className="mx-0.5 opacity-40">›</span>}
          <span className="text-muted-foreground">{entry.label}</span>
        </span>
      ))}
      {path.length > 0 && <span className="mx-0.5 opacity-40">›</span>}
      <span className="font-semibold">{currentLabel}</span>
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

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging ? "opacity-50" : "opacity-100", "relative")}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="bg-none border-none cursor-grab p-1 flex items-center text-muted-foreground shrink-0 touch-none rounded hover:bg-accent"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

function blockLabel(block: ClientBlock): string {
  const s = block.labels?.singular
  if (typeof s === "string") return s
  return block.slug
}

function BlockCard({
  row,
  index,
}: {
  row: { id: string; blockType?: string }
  index: number
}) {
  const ctx = useBlockCardContext()
  const block = ctx.blocks.find((b) => b.slug === row.blockType)
  const isActive = ctx.editingRowIndex === index
  const isHidden = ctx.getDataByPath(`${ctx.path}.${index}.hidden`) as boolean | undefined
  const IconComponent = block ? BLOCK_ICONS[block.slug] : undefined

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        isActive && "ring-2 ring-primary",
        isHidden && "opacity-50",
      )}
      onClick={() => ctx.setEditingRowIndex(index)}
    >
      <div className="flex items-center gap-2 p-3">
        {IconComponent && (
          <IconComponent size={ICON_SIZE} className="shrink-0 opacity-50" />
        )}
        <span className="flex-1 font-medium text-sm">
          {block ? blockLabel(block) : "Unknown"} #{index + 1}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => {
            e.stopPropagation()
            const current = ctx.getDataByPath(`${ctx.path}.${index}.hidden`) as boolean | undefined
            ctx.dispatchFields({
              type: "UPDATE",
              path: `${ctx.path}.${index}.hidden`,
              value: !current,
            } as any)
          }}
          aria-label="Toggle visibility"
        >
          {isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={(e) => e.stopPropagation()}
              aria-label="Delete block"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usuń blok</AlertDialogTitle>
              <AlertDialogDescription>
                Czy na pewno chcesz usunąć ten blok? Tej operacji nie można cofnąć.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={() => ctx.removeFieldRow({ path: ctx.path, rowIndex: index })}>
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}

const BlockCardContext = createContext<{
  path: string
  blocks: ClientBlock[]
  editingRowIndex: number | null
  dispatchFields: (action: any) => void
  getDataByPath: (path: string) => unknown
  removeFieldRow: (args: { path: string; rowIndex: number }) => void
  setEditingRowIndex: (i: number | null) => void
}>(null as any)

function useBlockCardContext() {
  return useContext(BlockCardContext)
}

export const BlocksField: BlocksFieldClientComponent = (props) => {
  const { field, path, permissions, readOnly, schemaPath: schemaPathFromProps } = props
  const schemaPath = schemaPathFromProps ?? field.name
  const blocks: ClientBlock[] = (field.blocks ?? []) as ClientBlock[]

  /* ── Hooks: must be called before any useCallback that references them ── */
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

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

  /* ── Sensors ── */
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
      <Card className="field-type blocks-field">
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap p-4 pb-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingRowIndex(null)}
            className="mr-1"
          >
            ←
          </Button>
          <Breadcrumb path={breadcrumbPath} currentLabel={currentLabel} />
        </div>
        <CardContent>
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="field-type blocks-field">
      <CardContent className="p-4">
        <header className="mb-3">
          <h3 className="m-0 font-normal text-xs uppercase tracking-wider text-muted-foreground">
            <Breadcrumb path={breadcrumbPath} currentLabel={fieldLabel} />
          </h3>
        </header>

        <BlockCardContext.Provider value={{
          path,
          blocks,
          editingRowIndex,
          dispatchFields,
          getDataByPath,
          removeFieldRow,
          setEditingRowIndex,
        }}>
          <DndContext id={`dnd-${path}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <SortableRow key={row.id} id={row.id}>
                    <BlockCard row={row} index={i} />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No blocks added yet
            </p>
          )}
        </BlockCardContext.Provider>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="size-4" />
            Add Block
          </Button>
          <CommandDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <CommandInput placeholder="Search blocks..." />
            <CommandList>
              <CommandEmpty>No blocks found.</CommandEmpty>
              <CommandGroup>
                {blocks.filter((b) => canAddBlock(b.slug)).map((block) => {
                  const Icon = BLOCK_ICONS[block.slug]
                  return (
                    <CommandItem
                      key={block.slug}
                      onSelect={() => {
                        addFieldRow({
                          blockType: block.slug,
                          path,
                          rowIndex: rows.length,
                          schemaPath,
                        })
                        setAddDialogOpen(false)
                      }}
                    >
                      {Icon && <Icon size={14} />}
                      <span>{blockLabel(block)}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      </CardContent>
    </Card>
  )
}
