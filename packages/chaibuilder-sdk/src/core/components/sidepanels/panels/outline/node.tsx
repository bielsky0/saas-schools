import {
  ExclamationTriangleIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { atom, useAtom } from "jotai";
import { get, has, isEmpty, startCase } from "lodash-es";
import { memo, ReactNode, useEffect, useMemo } from "react";
import { NodeRendererProps } from "react-arborist";
import { useTranslation } from "react-i18next";
import { canvasIframeAtom } from "~/atoms/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import { TypeIcon } from "~/core/components/sidepanels/panels/outline/block-type-icon";
import { ROOT_TEMP_KEY } from "~/core/constants/STRINGS";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { canAcceptChildBlock, canAddChildBlock } from "~/core/functions/block-helpers";
import { pubsub } from "~/core/pubsub";
import { cn } from "~/core/utils/cn";
import { useBlockHighlight } from "~/hooks/use-block-highlight";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useStructureValidation } from "~/hooks/use-structure-validation";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import { ConfirmDeleteSectionDialog } from "./confirm-delete-section-dialog";
import { DragHandle } from "./drag-handle";
import { BlockPickerPopover } from "~/pages/client/layouts/left-panel/block-picker";

export type TreeKind = "sections" | "blocks" | "outline";

const Input = ({ node }: { node: NodeRendererProps<any>["node"] }) => {
  return (
    <input
      autoFocus
      className={cn(
        "ml-2 !h-4 w-full rounded-sm border border-border bg-background px-1 text-[11px] leading-tight outline-none",
        node.isSelected ? "border-primary/40 text-black" : "",
      )}
      type="text"
      defaultValue={node.data?._name || node.data?._type}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => node.submit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") node.submit(e.currentTarget.value);
      }}
    />
  );
};

const currentAddSelection = atom<any>(null);

export const getBlockDisplayName = (data: any): string => {
  if (data?._name) return data._name;
  if (data?._type === "Box" && data?.tag && data?.tag !== "div") {
    return startCase(data.tag);
  }
  return data?._type?.split("/").pop() || "";
};

const truncateText = (text: string, maxLength: number) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
};

const SECTION_ROLE_ICON_PATHS: Record<string, ReactNode> = {
  header: (
    <>
      <path
        fillRule="evenodd"
        d="M1.5 3.25c0-.966.784-1.75 1.75-1.75h9.5c.966 0 1.75.784 1.75 1.75v1.5a1.75 1.75 0 0 1-1.75 1.75h-9.5a1.75 1.75 0 0 1-1.75-1.75zm1.75-.25a.25.25 0 0 0-.25.25v1.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25v-1.5a.25.25 0 0 0-.25-.25z"
      />
      <path d="M1.5 9.25c0-.966.784-1.75 1.75-1.75h.5a.75.75 0 0 1 0 1.5h-.5a.25.25 0 0 0-.25.25v.5a.75.75 0 0 1-1.5 0z" />
      <path d="M1.5 12.75c0 .966.784 1.75 1.75 1.75h.5a.75.75 0 0 0 0-1.5h-.5a.25.25 0 0 1-.25-.25v-.5a.75.75 0 0 0-1.5 0z" />
      <path d="M12.75 7.5c.966 0 1.75.784 1.75 1.75v.5a.75.75 0 0 1-1.5 0v-.5a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5z" />
      <path d="M12.75 14.5a1.75 1.75 0 0 0 1.75-1.75v-.5a.75.75 0 0 0-1.5 0v.5a.25.25 0 0 1-.25.25h-.5a.75.75 0 0 0 0 1.5z" />
      <path d="M9.75 8.25a.75.75 0 0 1-.75.75h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75" />
      <path d="M9 14.5a.75.75 0 0 0 0-1.5h-2a.75.75 0 0 0 0 1.5z" />
    </>
  ),
  section: (
    <>
      <path d="M1.5 3.25c0-.966.784-1.75 1.75-1.75h1a.75.75 0 0 1 0 1.5h-1a.25.25 0 0 0-.25.25v1a.75.75 0 0 1-1.5 0z" />
      <path
        fillRule="evenodd"
        d="M1.5 7.25c0-.966.784-1.75 1.75-1.75h9.5c.966 0 1.75.784 1.75 1.75v1.5a1.75 1.75 0 0 1-1.75 1.75h-9.5a1.75 1.75 0 0 1-1.75-1.75zm1.75-.25a.25.25 0 0 0-.25.25v1.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25v-1.5a.25.25 0 0 0-.25-.25z"
      />
      <path d="M1.5 12.75c0 .966.784 1.75 1.75 1.75h1a.75.75 0 0 0 0-1.5h-1a.25.25 0 0 1-.25-.25v-1a.75.75 0 0 0-1.5 0z" />
      <path d="M12.75 1.5c.966 0 1.75.784 1.75 1.75v1a.75.75 0 0 1-1.5 0v-1a.25.25 0 0 0-.25-.25h-1a.75.75 0 0 1 0-1.5z" />
      <path d="M12.75 14.5a1.75 1.75 0 0 0 1.75-1.75v-1a.75.75 0 0 0-1.5 0v1a.25.25 0 0 1-.25.25h-1a.75.75 0 0 0 0 1.5z" />
      <path d="M9.75 2.25a.75.75 0 0 1-.75.75h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75" />
      <path d="M9 14.5a.75.75 0 0 0 0-1.5h-2a.75.75 0 0 0 0 1.5z" />
    </>
  ),
  footer: (
    <>
      <path d="M1.5 3.25c0-.966.784-1.75 1.75-1.75h.5a.75.75 0 0 1 0 1.5h-.5a.25.25 0 0 0-.25.25v.5a.75.75 0 0 1-1.5 0z" />
      <path
        fillRule="evenodd"
        d="M1.5 11.25c0-.966.784-1.75 1.75-1.75h9.5c.966 0 1.75.784 1.75 1.75v1.5a1.75 1.75 0 0 1-1.75 1.75h-9.5a1.75 1.75 0 0 1-1.75-1.75zm1.75-.25a.25.25 0 0 0-.25.25v1.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25v-1.5a.25.25 0 0 0-.25-.25z"
      />
      <path d="M1.5 6.75c0 .966.784 1.75 1.75 1.75h.5a.75.75 0 0 0 0-1.5h-.5a.25.25 0 0 1-.25-.25v-.5a.75.75 0 0 0-1.5 0z" />
      <path d="M12.75 1.5c.966 0 1.75.784 1.75 1.75v.5a.75.75 0 0 1-1.5 0v-.5a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5z" />
      <path d="M12.75 8.5a1.75 1.75 0 0 0 1.75-1.75v-.5a.75.75 0 0 0-1.5 0v.5a.25.25 0 0 1-.25.25h-.5a.75.75 0 0 0 0 1.5z" />
      <path d="M9.75 2.25a.75.75 0 0 1-.75.75h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75" />
      <path d="M9 8.5a.75.75 0 0 0 0-1.5h-2a.75.75 0 0 0 0 1.5z" />
    </>
  ),
};

/**
 * Shopify-style icons for section rows, driven by the group role
 * (header → layout-header, template → layout-section, footer → layout-footer).
 */
export const SectionRoleIcon = ({ role, className }: { role: string; className?: string }) => (
  <svg viewBox="0 0 16 16" className={cn("flex-shrink-0 fill-current", className)} aria-hidden="true">
    {SECTION_ROLE_ICON_PATHS[role] ?? SECTION_ROLE_ICON_PATHS.section}
  </svg>
);

type NodeProps = NodeRendererProps<any> & {
  /** Which tree context this row is rendered in. */
  treeKind?: TreeKind;
  /** Group role for section rows (header / template / footer). */
  groupRole?: string;
};

export const Node = memo(({ node, style, dragHandle, treeKind = "outline", groupRole }: NodeProps) => {
  const { t } = useTranslation();
  const updateBlockProps = useUpdateBlocksProps();
  const [iframe] = useAtom<HTMLIFrameElement>(canvasIframeAtom);
  let previousState: boolean | null = null;
  const hasChildren = node.children && node.children.length > 0;
  const isTopLevel = node.level === 0;
  const isSectionTree = treeKind === "sections";
  const isBlockTree = treeKind === "blocks";
  const isOutlineTree = !isSectionTree && !isBlockTree;
  const isSectionRow = isSectionTree && isTopLevel;
  const { highlightBlock, clearHighlight } = useBlockHighlight();
  const { id, data, isSelected, willReceiveDrop, isDragging, isEditing, handleClick } = node;
  const validations = useStructureValidation();
  const errors = useMemo(() => validations.getBlockErrors(id), [validations, id]);
  const isShown = get(data, "_show", true);
  const handleToggle = (event: any) => {
    event.stopPropagation();
    if (!isShown) return;
    /*Toggle the node open and close State*/
    node.toggle();
  };

  const handleDragStart = (node: any) => {
    if (node.isInternal) {
      previousState = node.isOpen;
      if (node.isOpen) {
        node.close();
      }
    }
  };

  const handleDragEnd = (node: any) => {
    if (node.isInternal && previousState !== null) {
      if (previousState) {
        node.open();
      } else {
        node.close();
      }
      previousState = null; // Reset the previous state
    }
  };

  const [addSelectParentHighlight, setAddSelectParentHighlight]: any = useAtom(currentAddSelection);
  const onMouseEnter = () => {
    onMouseLeave();
    if (!node.parent?.isSelected) {
      setAddSelectParentHighlight(node?.parent?.id as any);
    }
  };

  const onMouseLeave = () => {
    setAddSelectParentHighlight(null);
  };

  const handleNodeClickWithoutPropagating = (e: any) => {
    onMouseLeave();
    /**
     * To stop propagation of the event to the parent
     * Tree Component to avoid clearing the selection of blocks
     * and allowing to select current block.
     */
    e.stopPropagation();
    /**
     * Shopify behaviour: a row click only selects the row (opens its settings);
     * expanding/collapsing happens exclusively via the disclosure chevron.
     * The outline tree keeps the legacy click-to-toggle behaviour.
     */
    if (isOutlineTree && !node.isOpen && isShown) {
      node.toggle();
    }
    /**
     * It will work when a node is clicked.
     * The onSelect in the parent Tree Component
     * will also trigger the selection of the node.
     */
    handleClick(e);
  };

  useEffect(() => {
    //TODO: Come back to this later. Might lead to a performance issue
    const timedToggle = setTimeout(() => {
      if (willReceiveDrop && !node.isOpen && !isDragging && isShown) {
        node.toggle();
      }
    }, 500);

    return () => clearTimeout(timedToggle);
  }, [willReceiveDrop, node, isDragging, isShown]);

  const setDropAttribute = (id: string, value: string) => {
    const innerDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const dropTarget = innerDoc?.querySelector(`[data-block-id=${id}]`) as HTMLElement;

    if (dropTarget) {
      dropTarget.setAttribute("data-drop", value);
    }

    const rect = dropTarget.getBoundingClientRect();
    const iframeRect = iframe.getBoundingClientRect();
    const isInViewport =
      rect.top >= iframeRect.top &&
      rect.left >= iframeRect.left &&
      rect.bottom <= iframeRect.bottom &&
      rect.right <= iframeRect.right;
    if (!isInViewport && innerDoc) {
      innerDoc.documentElement.scrollTop = dropTarget.offsetTop - iframeRect.top;
    }
  };

  const addBlockOnPosition = (position: number) => {
    onMouseLeave();
    const parentId = get(node, "parent.id");
    if (parentId !== "__REACT_ARBORIST_INTERNAL_ROOT__") {
      pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, { _id: parentId, position });
    } else {
      pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, { position });
    }
  };

  const { librarySite } = useBuilderProp("flags", { librarySite: false });
  const isLibBlock = useMemo(() => {
    return librarySite && has(data, "_libBlockId") && !isEmpty(data._libBlockId);
  }, [data, librarySite]);

  const isPartialBlock = useMemo(() => {
    return data?._type === "PartialBlock" || data?._type === "GlobalBlock";
  }, [data]);

  if (data._type === ROOT_TEMP_KEY) {
    const isOutlineRow = treeKind === "outline";
    const addRow = (
      <div
        role="button"
        tabIndex={-1}
        onClick={(e) => {
          if (isOutlineRow) {
            e.stopPropagation();
            addBlockOnPosition(-1);
          }
        }}
        className={cn(
          "flex h-[30px] cursor-pointer items-center rounded-lg px-1 text-[12px] leading-4 text-[#005BD3] hover:bg-[#F1F1F1]",
          isOutlineRow ? "gap-2" : "gap-1",
        )}>
        {!isOutlineRow && (
          <>
            <span className="h-5 w-5 shrink-0" />
            <span className="h-4 w-4 shrink-0" />
          </>
        )}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#005BD3]">
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M4.25 8a.75.75 0 0 1 .75-.75h2.25v-2.25a.75.75 0 0 1 1.5 0v2.25h2.25a.75.75 0 0 1 0 1.5h-2.25v2.25a.75.75 0 0 1-1.5 0v-2.25h-2.25a.75.75 0 0 1-.75-.75" />
            <path
              fillRule="evenodd"
              d="M8 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14m0-1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 1 0 0 11"
            />
          </svg>
        </span>
        <span>{t("Add block")}</span>
      </div>
    );

    if (isOutlineRow) {
      return (
        <div className="group relative mx-2" style={style}>
          {addRow}
        </div>
      );
    }

    const parentId = get(node, "parent.id");
    return (
      <div className="group relative mx-2" style={style}>
        <BlockPickerPopover
          trigger={addRow}
          parentId={parentId === "__REACT_ARBORIST_INTERNAL_ROOT__" ? undefined : parentId}
          position={-1}
        />
      </div>
    );
  }

  /**
   * Shopify ordering: chevron (leftmost) → drag handle → icon → title → actions.
   * Sections rows are draggable via the whole row, so their handle is passive
   * (visual affordance only, must not intercept pointer events).
   */
  const showChevron = hasChildren;
  const isHandlePassive = isSectionRow;
  const showHandle = isSectionTree || isBlockTree || !isTopLevel;
  const canDelete = isOutlineTree || isSectionRow;
  const actionBtnClass = cn(
    "flex h-6 w-6 cursor-pointer items-center justify-center rounded",
    isSelected ? "text-white hover:bg-white/20" : "text-[#4A4A4A] hover:bg-black/5",
  );

  const chevronArrow = (
    <span className={cn("inline-flex transition-transform duration-200", node.isOpen && "rotate-180")}>
      <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M4.24 6.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 0 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06"
        />
      </svg>
    </span>
  );

  /**
   * Shopify shows an "Add" ("+") affordance between rows (and above the first
   * row of a group) whenever hovering. The outline tree keeps its legacy
   * behaviour (only rendered when DnD is disabled).
   */
  const rowIndexOk = node?.rowIndex !== null && node?.rowIndex !== undefined;
  // TODO: temporarily disabled (inter-block add buttons). Re-enable by restoring
  // the tree-kind logic below when wanted again.
  const addBetweenVisible = false;
  const showAddBetween =
    data._type !== ROOT_TEMP_KEY &&
    rowIndexOk &&
    addBetweenVisible &&
    ((node.parent?.isOpen && canAddChildBlock(get(node, "parent.data._type"))) ||
      node?.parent?.id === "__REACT_ARBORIST_INTERNAL_ROOT__");

  return (
    <div
      className={cn(
        "relative mx-2 flex h-full items-center rounded-lg",
        isSelected ? "bg-[#005BD3] text-white" : "hover:bg-[#F1F1F1]",
      )}
      aria-current={isSelected ? "true" : undefined}>
      <div
        className="w-full"
        onMouseEnter={() => highlightBlock(id)}
        onMouseLeave={() => clearHighlight()}
        onClick={handleNodeClickWithoutPropagating}
        style={style}
        data-node-id={id}
        onDragStart={() => handleDragStart(node)}
        onDragEnd={() => handleDragEnd(node)}
        onDragOver={(e) => {
          e.preventDefault();
          setDropAttribute(id, "yes");
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDropAttribute(id, "no");
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDropAttribute(id, "no");
        }}>
        {showAddBetween && (
          <div className="group relative ml-5 h-full w-full cursor-pointer">
            <div
              onClick={(e) => {
                e.stopPropagation();
                addBlockOnPosition(node.childIndex);
              }}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              className="absolute -top-0.5 h-0.5 w-[90%] rounded bg-[#005BD3] opacity-0 delay-200 duration-200 group-hover:opacity-100">
              <div className="absolute left-1/2 top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-full bg-[#005BD3] p-1 outline outline-2 outline-white hover:bg-[#005BD3]">
                <PlusIcon className="h-2 w-2 stroke-[2] text-white" />
              </div>
            </div>
          </div>
        )}
        <div className="absolute left-0 right-0 top-0 -z-10 h-full">
          <div
            className={cn(
              "h-full transition-colors",
              willReceiveDrop && canAcceptChildBlock(data._type, "Icon") ? "bg-[#005BD3]/10" : "",
              node?.id === addSelectParentHighlight ? "bg-gray-100 dark:bg-gray-900" : "",
            )}
          />
        </div>
        <div
          ref={isTopLevel && !isBlockTree ? (dragHandle as any) : undefined}
          className={cn(
            "group relative flex w-full cursor-pointer items-center justify-between gap-1 px-1 outline-none",
            isDragging && "opacity-40",
            !isShown ? "opacity-[0.45]" : "",
            isLibBlock && isSelected && "text-primary",
          )}>
          <div className="flex items-center gap-1">
            {isSectionTree || isBlockTree ? (
              <button
                onClick={showChevron ? handleToggle : undefined}
                type="button"
                aria-expanded={node.isOpen}
                aria-hidden={!showChevron}
                tabIndex={showChevron ? 0 : -1}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center",
                  showChevron ? "cursor-pointer" : "cursor-default",
                  isSelected ? "text-white" : "text-[#4A4A4A] group-hover:text-[#303030]",
                )}>
                {showChevron && chevronArrow}
              </button>
            ) : (
              showChevron && (
                <button
                  onClick={handleToggle}
                  type="button"
                  aria-expanded={node.isOpen}
                  className={cn(
                    "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center",
                    isSelected ? "text-white" : "text-[#4A4A4A] group-hover:text-[#303030]",
                  )}>
                  {chevronArrow}
                </button>
              )
            )}
            {showHandle && (
              <DragHandle
                ref={isHandlePassive ? undefined : (dragHandle as any)}
                passive={isHandlePassive}
                className={isSelected ? "opacity-100 text-white" : "text-[#4A4A4A]"}
              />
            )}
            <div
              className={cn(
                "leading-1 flex w-full items-center",
                isLibBlock && "text-orange-600/90",
                isPartialBlock && "text-purple-600/90",
              )}>
              {errors.length > 0 ? (
                <div className="text-red-500">
                  <ExclamationTriangleIcon className="h-3 w-3" />
                </div>
              ) : isSectionRow && groupRole ? (
                <SectionRoleIcon role={groupRole} className="h-4 w-4" />
              ) : (
                <TypeIcon type={data?._type} />
              )}

              {isEditing ? (
                <Input node={node} />
              ) : (
                <div
                  className="flex flex-1 items-center gap-x-1 truncate text-[12px] font-normal leading-4"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    node.edit();
                    node.deselect();
                  }}>
                  <span
                    className={!isShown ? "line-through decoration-[#9CA3AF]" : undefined}
                    title={getBlockDisplayName(data).length > 24 ? getBlockDisplayName(data) : ""}>
                    {truncateText(getBlockDisplayName(data), 24)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-0.5 pr-px opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    updateBlockProps([id], { _show: !isShown });
                    if (node.isOpen) {
                      node.toggle();
                    }
                  }}
                  aria-label={t(isShown ? "Hide the block from page" : "Show the block on page")}
                  aria-pressed={!isShown}
                  className={actionBtnClass}>
                  {isShown ? <EyeOpenIcon className="h-4 w-4" /> : <EyeClosedIcon className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent className="isolate z-[9999] text-xs" side="bottom">
                {t(isShown ? "Hide the block from page" : "Show the block on page")}
              </TooltipContent>
            </Tooltip>
            {canDelete && (
              <ConfirmDeleteSectionDialog
                blockId={id}
                blockName={getBlockDisplayName(data)}
                trigger={
                  <span
                    onClick={(event) => event.stopPropagation()}
                    role="button"
                    aria-label={t("Delete")}
                    className={actionBtnClass}>
                    <TrashIcon className="h-4 w-4" />
                  </span>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});