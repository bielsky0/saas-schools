"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  Calendar,
  ChevronRight,
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
  useDroppable,
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

/*
 * Container detection — currently slug-based (grid, column).
 *
 * TODO: replace with a generic scan of block.fields for type:"blocks"
 * entries when more container block types are added.
 */
const CROSS_CONTAINER_PREFIX = "cross:"

const CONTAINER_SLUGS = new Set(["grid", "column"])

function isContainerBlock(block: ClientBlock): boolean {
  return CONTAINER_SLUGS.has(block.slug)
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

type BlockCardContextValue = {
  path: string
  blocks: ClientBlock[]
  editingRowIndex: number | null
  dispatchFields: (action: any) => void
  formFields: Record<string, any>
  getDataByPath: (path: string) => unknown
  removeFieldRow: (args: { path: string; rowIndex: number }) => void
  setEditingRowIndex: (i: number | null) => void
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>
  addFieldRow: (args: { blockType: string; path: string; rowIndex: number; schemaPath: string }) => void
  setAddTarget: (target: { path: string; schemaPath: string }) => void
  setAddDialogOpen: (open: boolean) => void
  setModified: (modified: boolean) => void
  gridAddInfo: { parentFormPath: string; cellsSchemaPath: string } | null
  setGridAddInfo: (info: { parentFormPath: string; cellsSchemaPath: string } | null) => void
}

const BlockCardContext = createContext<BlockCardContextValue>(null as any)

function useBlockCardContext() {
  return useContext(BlockCardContext)
}

function TreeItem({
  row,
  index,
  formPath,
  schemaPath,
  depth,
  isTopLevel,
  parentFormPath,
}: {
  row: { id: string; blockType?: string }
  index: number
  formPath: string
  schemaPath: string
  depth: number
  isTopLevel: boolean
  parentFormPath: string
}) {
  const ctx = useBlockCardContext()
  const block = ctx.blocks.find((b) => b.slug === row.blockType)
  const isContainer = block && isContainerBlock(block)
  const isActive = isTopLevel && ctx.editingRowIndex === index
  const isHidden = ctx.getDataByPath(`${formPath}.hidden`) as boolean | undefined
  const isExpanded = ctx.expandedPaths.has(formPath)
  const IconComponent = block ? BLOCK_ICONS[block.slug] : undefined

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    ctx.setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(formPath)) next.delete(formPath)
      else next.add(formPath)
      return next
    })
  }

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "px-2.5 py-2 border-b border-border hover:bg-muted/50 transition-colors",
          isTopLevel && "cursor-pointer",
          isActive && "bg-accent/10 border-l-2 border-l-primary",
          isHidden && "opacity-50",
        )}
        onClick={isTopLevel ? () => ctx.setEditingRowIndex(index) : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center shrink-0" style={{ width: 18 }}>
            {isContainer ? (
              <button
                type="button"
                onClick={toggleExpand}
                className="p-0 bg-none border-none cursor-pointer inline-flex items-center justify-center"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <ChevronRight
                  size={14}
                  className={cn("transition-transform text-muted-foreground", isExpanded && "rotate-90")}
                />
              </button>
            ) : null}
          </span>
          {IconComponent && (
            <IconComponent size={ICON_SIZE} className="shrink-0 opacity-50" />
          )}
          <span className="flex-1 font-medium text-sm truncate min-w-0">
            {block ? blockLabel(block) : "Unknown"} #{index + 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation()
              const current = ctx.getDataByPath(`${formPath}.hidden`) as boolean | undefined
              ctx.dispatchFields({
                type: "UPDATE",
                path: `${formPath}.hidden`,
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
                className="size-6 text-destructive hover:text-destructive"
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
                <AlertDialogAction onClick={() => ctx.removeFieldRow({ path: parentFormPath, rowIndex: index })}>
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isContainer && isExpanded && (
        <TreeChildren
          block={block!}
          parentFormPath={formPath}
          schemaPathPrefix={`${schemaPath}${block!.slug}`}
          depth={depth + 1}
        />
      )}
    </div>
  )
}

function TreeChildren({
  block,
  parentFormPath,
  schemaPathPrefix,
  depth,
}: {
  block: ClientBlock
  parentFormPath: string
  schemaPathPrefix: string
  depth: number
}) {
  const ctx = useBlockCardContext()

  if (block.slug === "grid") {
    const blockData = ctx.getDataByPath(parentFormPath) as Record<string, any> | undefined
    const cellsData = blockData?.cells as
      | { id?: string; blocks?: { id: string; blockType: string }[] }[]
      | undefined

    return (
      <div className="border-l-2 border-border/30 my-1 space-y-1" style={{ paddingLeft: depth > 3 ? 0 : 16 }}>
        {cellsData?.map((cell: any, cellIndex: number) => {
          const childBlocks = cell.blocks as
            | { id: string; blockType: string }[]
            | undefined
          const childBlocksPath = `${parentFormPath}.cells.${cellIndex}.blocks`
          const childSchemaPath = `${schemaPathPrefix}.cells.blocks`

          return (
            <div key={cell.id ?? cellIndex} className="space-y-1">
              {childBlocks?.map((childBlock: any, childIndex: number) => (
                <TreeItem
                  key={childBlock.id ?? childIndex}
                  row={{ id: childBlock.id ?? `${childBlocksPath}.${childIndex}`, blockType: childBlock.blockType }}
                  index={childIndex}
                  formPath={`${childBlocksPath}.${childIndex}`}
                  schemaPath={childSchemaPath}
                  depth={depth + 1}
                  isTopLevel={false}
                  parentFormPath={childBlocksPath}
                />
              ))}
            </div>
          )
        })}
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors px-1 py-0.5 w-full text-left"
          onClick={() => {
            ctx.setGridAddInfo({
              parentFormPath,
              cellsSchemaPath: `${schemaPathPrefix}.cells`,
            })
            ctx.setAddTarget({ path: `${parentFormPath}.cells`, schemaPath: `${schemaPathPrefix}.cells` })
            ctx.setAddDialogOpen(true)
          }}
        >
          <Plus className="size-3 shrink-0" />
          + Dodaj blok
        </button>
      </div>
    )
  }

  if (block.slug === "column") {
    const blockData = ctx.getDataByPath(parentFormPath) as Record<string, any> | undefined
    const childBlocks = blockData?.blocks as
      | { id: string; blockType: string }[]
      | undefined
    const childBlocksPath = `${parentFormPath}.blocks`
    const childSchemaPath = `${schemaPathPrefix}.blocks`

    return (
      <div className="border-l-2 border-border/30 my-1 space-y-1" style={{ paddingLeft: depth > 3 ? 0 : 16 }}>
        <DroppableArea id={`${CROSS_CONTAINER_PREFIX}${childBlocksPath}`}>
          {childBlocks?.map((childBlock: any, childIndex: number) => (
            <TreeItem
              key={childBlock.id ?? childIndex}
              row={{ id: childBlock.id ?? `${childBlocksPath}.${childIndex}`, blockType: childBlock.blockType }}
              index={childIndex}
              formPath={`${childBlocksPath}.${childIndex}`}
              schemaPath={childSchemaPath}
              depth={depth + 1}
              isTopLevel={false}
              parentFormPath={childBlocksPath}
            />
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors px-1 py-0.5 w-full text-left"
              onClick={() => {
                ctx.setGridAddInfo(null)
                ctx.setAddTarget({ path: childBlocksPath, schemaPath: childSchemaPath })
                ctx.setAddDialogOpen(true)
              }}
            >
              <Plus className="size-3 shrink-0" />
              + Dodaj blok
            </button>
        </DroppableArea>
      </div>
    )
  }

  return null
}

function DroppableArea({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn(isOver && "ring-2 ring-inset ring-primary/40 rounded-md min-h-[1.5rem] transition-all")}>
      {children}
    </div>
  )
}

function extractRowState(formFields: Record<string, any>, rowPath: string): Record<string, any> {
  const prefix = `${rowPath}.`
  const result: Record<string, any> = {}
  for (const [path, field] of Object.entries(formFields)) {
    if (path.startsWith(prefix)) {
      const subPath = path.slice(prefix.length)
      if (subPath === "id") continue
      result[subPath] = { ...field }
    }
  }
  return result
}

export const BlocksField: BlocksFieldClientComponent = (props) => {
  const { field, path, permissions, readOnly, schemaPath: schemaPathFromProps } = props
  const schemaPath = schemaPathFromProps ?? field.name
  const blocks: ClientBlock[] = (field.blocks ?? []) as ClientBlock[]

  /* ── Hooks: must be called before any useCallback that references them ── */
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [addTarget, setAddTarget] = useState<{ path: string; schemaPath: string }>({
    path,
    schemaPath,
  })
  const [gridAddInfo, setGridAddInfo] = useState<{ parentFormPath: string; cellsSchemaPath: string } | null>(null)

  const { addFieldRow, dispatchFields, getDataByPath, moveFieldRow, removeFieldRow, setModified } = useForm()

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

      const overId = String(over.id)
      if (overId.startsWith(CROSS_CONTAINER_PREFIX)) {
        const targetFormPath = overId.slice(CROSS_CONTAINER_PREFIX.length)
        const sourceIndex = rows.findIndex((r) => r.id === active.id)
        if (sourceIndex === -1) return
        const sourceBlockType = rows[sourceIndex]?.blockType
        if (!sourceBlockType) return
        const sourceRowPath = `${path}.${sourceIndex}`
        const subFieldState = extractRowState(formFields, sourceRowPath)

        const prefix = `${path}.`
        const afterPrefix = targetFormPath.replace(prefix, "")
        const colIdx = parseInt(afterPrefix.split(".")[0] ?? "", 10)
        if (isNaN(colIdx)) return

        removeFieldRow({ path, rowIndex: sourceIndex })

        const adjustedColIdx = sourceIndex < colIdx ? colIdx - 1 : colIdx
        addFieldRow({ blockType: sourceBlockType, path: `${path}.${adjustedColIdx}.blocks`, schemaPath: "", subFieldState })
        return
      }

      const oldIndex = rows.findIndex((r) => r.id === active.id)
      const newIndex = rows.findIndex((r) => r.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      moveFieldRow({ moveFromIndex: oldIndex, moveToIndex: newIndex, path })
    },
    [rows, moveFieldRow, path, formFields, addFieldRow, removeFieldRow],
  )

  const isCustomBlock = (slug: string): boolean =>
    blockAccess?.customKeys.includes(slug) ?? false
  const canAddBlock = (slug: string): boolean =>
    !isCustomBlock(slug) || (blockAccess?.granted.includes(slug) ?? true)

  if (editingRow && editingBlock && editingRowIndex !== null) {
    const currentLabel = `${blockLabel(editingBlock)} #${editingRowIndex + 1}`
    const fullPath = [...breadcrumbPath, { slug: editingBlock.slug, label: currentLabel }]

    return (
      <div className="field-type blocks-field">
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
        <div className="p-4">
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
      </div>
    )
  }

  return (
    <div className="field-type blocks-field">
      <div className="p-4">
        <header className="mb-3">
          <h3 className="m-0 font-normal text-xs uppercase tracking-wider text-muted-foreground">
            <Breadcrumb path={breadcrumbPath} currentLabel={fieldLabel} />
          </h3>
        </header>

        <BlockCardContext.Provider
          value={{
            path,
            blocks,
            editingRowIndex,
            dispatchFields,
            formFields,
            getDataByPath,
            removeFieldRow,
            setEditingRowIndex,
            expandedPaths,
            setExpandedPaths,
            addFieldRow,
            setAddTarget,
            setAddDialogOpen,
            setModified,
            gridAddInfo,
            setGridAddInfo,
          }}
        >
          <DndContext id={`dnd-${path}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-0">
                {rows.map((row, i) => (
                  <SortableRow key={row.id} id={row.id}>
                    <TreeItem
                      row={row}
                      index={i}
                      formPath={`${path}.${i}`}
                      schemaPath={schemaPath}
                      depth={0}
                      isTopLevel={true}
                      parentFormPath={path}
                    />
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
            variant="link"
            className="w-full gap-2 text-primary"
            onClick={() => {
              setGridAddInfo(null)
              setAddTarget({ path, schemaPath })
              setAddDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add Block
          </Button>
          <CommandDialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setGridAddInfo(null); }}>
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
                        if (gridAddInfo) {
                          const cellsPath = `${gridAddInfo.parentFormPath}.cells`
                          const cellsData = getDataByPath(cellsPath) as unknown[] | undefined
                          const cellIndex = cellsData?.length ?? 0
                          addFieldRow({ path: cellsPath, schemaPath: gridAddInfo.cellsSchemaPath, rowIndex: cellIndex } as any)
                          addFieldRow({
                            blockType: block.slug,
                            path: `${cellsPath}.${cellIndex}.blocks`,
                            schemaPath: `${gridAddInfo.cellsSchemaPath}.blocks`,
                            rowIndex: 0,
                          } as any)
                          setGridAddInfo(null)
                        } else {
                          const existingData = getDataByPath(addTarget.path) as unknown[] | undefined
                          addFieldRow({
                            blockType: block.slug,
                            path: addTarget.path,
                            rowIndex: existingData?.length ?? 0,
                            schemaPath: addTarget.schemaPath,
                          })
                        }
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
      </div>
    </div>
  )
}
