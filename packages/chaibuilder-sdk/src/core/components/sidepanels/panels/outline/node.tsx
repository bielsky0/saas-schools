import {
  ChevronRightIcon,
  DotsVerticalIcon,
  ExclamationTriangleIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { atom, useAtom } from "jotai";
import { get, has, isEmpty, startCase } from "lodash-es";
import { memo, useEffect, useMemo } from "react";
import { NodeRendererProps } from "react-arborist";
import { useTranslation } from "react-i18next";
import { canvasIframeAtom } from "~/atoms/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useIsDragAndDropEnabled } from "~/core/components/canvas/dnd/drag-and-drop/hooks";
import { BlockMoreOptions } from "~/core/components/sidepanels/panels/outline/block-more-options";
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

export const Node = memo(({ node, style, dragHandle }: NodeRendererProps<any>) => {
  const { t } = useTranslation();
  const updateBlockProps = useUpdateBlocksProps();
  const [iframe] = useAtom<HTMLIFrameElement>(canvasIframeAtom);
  let previousState: boolean | null = null;
  const hasChildren = node.children && node.children.length > 0;
  const { highlightBlock, clearHighlight } = useBlockHighlight();
  const isDragAndDropEnabled = useIsDragAndDropEnabled();
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
    if (!node.isOpen && isShown) {
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

  if (id === ROOT_TEMP_KEY) {
    return (
      <div className="group relative mt-2 w-full cursor-pointer">
        <br />
        <div
          role="button"
          onClick={() => addBlockOnPosition(-1)}
          className="h-1 rounded bg-primary opacity-0 duration-200 group-hover:opacity-100">
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center gap-x-1 rounded-full bg-primary px-3 py-1 text-[9px] leading-tight text-white hover:bg-primary">
            <PlusIcon className="w-2.4 h-2.5 stroke-[5] text-white" /> {t("Add block")}
          </div>
        </div>
        <br />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center border-l-2",
        isSelected ? "border-primary bg-[#f0f0f1]" : "border-transparent hover:bg-[#f6f6f7]",
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
        {node.level > 0 && (
          <div className="pointer-events-none absolute left-0 top-0 h-full">
            {Array.from({ length: node.level }).map((_, index) => {
              return (
                <div
                  key={index}
                  className={
                    "absolute top-0 h-full border-l border-black/10 transition-colors group-hover/parent:border-black/30"
                  }
                  style={{
                    left: `${index * 18 + 10}px`,
                  }}
                />
              );
            })}
          </div>
        )}
        {!isDragAndDropEnabled &&
          node?.rowIndex !== null &&
          node?.rowIndex !== undefined &&
          node?.rowIndex > 0 &&
          ((node.parent?.isOpen && canAddChildBlock(get(node, "parent.data._type"))) ||
            node?.parent?.id === "__REACT_ARBORIST_INTERNAL_ROOT__") && (
            <div className="group relative ml-5 h-full w-full cursor-pointer">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  addBlockOnPosition(node.childIndex);
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="absolute -top-0.5 h-0.5 w-[90%] rounded bg-primary/80 opacity-0 delay-200 duration-200 group-hover:opacity-100">
                <div className="absolute left-1/2 top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-full bg-primary/80 p-1 outline outline-2 outline-white hover:bg-primary/80">
                  <PlusIcon className="h-2 w-2 stroke-[2] text-white" />
                </div>
              </div>
            </div>
          )}
        <div className="absolute left-0 right-0 top-0 -z-10 h-full">
          <div
            className={cn(
              "h-full transition-colors",
              willReceiveDrop && canAcceptChildBlock(data._type, "Icon") ? "bg-primary/10" : "",
              node?.id === addSelectParentHighlight ? "bg-gray-100 dark:bg-gray-900" : "",
            )}
          />
        </div>
        <div
          className={cn(
            "group relative flex w-full cursor-pointer items-center justify-between space-x-px px-2 py-1 outline-none",
            isDragging && "bg-[#f6f6f7] opacity-50",
            !isShown ? "line-through opacity-50" : "",
            isLibBlock && isSelected && "text-primary",
          )}>
          <div className="flex items-center">
            <DragHandle ref={dragHandle} className={isSelected ? "opacity-100 text-gray-700" : "text-gray-500"} />
            <div
              className={`flex h-4 w-4 rotate-0 transform cursor-pointer items-center justify-center transition-transform duration-100 ${
                node.isOpen ? "rotate-90" : ""
              }`}>
              {hasChildren && (
                <button onClick={handleToggle} type="button">
                  <ChevronRightIcon className={`h-3 w-3`} />
                </button>
              )}
            </div>
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
              ) : (
                <TypeIcon type={data?._type} />
              )}

              {isEditing ? (
                <Input node={node} />
              ) : (
                <div
                  className={cn(
                    "ml-1.5 flex items-center gap-x-1 truncate text-[13px]",
                    node.level === 0 ? "font-medium" : "font-normal",
                  )}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    node.edit();
                    node.deselect();
                  }}>
                  <span title={getBlockDisplayName(data).length > 24 ? getBlockDisplayName(data) : ""}>
                    {truncateText(getBlockDisplayName(data), 24)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-0.5 pr-px opacity-0 transition-opacity group-hover:opacity-100">
            {canAddChildBlock(data?._type) && isShown ? (
              <Tooltip>
                <TooltipTrigger
                  onClick={() => pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, { _id: id })}
                  className="cursor-pointer rounded p-1 hover:bg-black/5"
                  asChild>
                  <PlusIcon className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="isolate z-[9999]" side="bottom">
                  {t("Add block inside")}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                onClick={(event) => {
                  event.stopPropagation();
                  updateBlockProps([id], { _show: !isShown });
                  if (node.isOpen) {
                    node.toggle();
                  }
                }}
                className="cursor-pointer rounded p-1 hover:bg-black/5"
                asChild>
                {isShown ? <EyeClosedIcon className="h-4 w-4" /> : <EyeOpenIcon className="h-4 w-4" />}
              </TooltipTrigger>
              <TooltipContent className="isolate z-[9999] text-xs" side="bottom">
                {t(isShown ? "Hide the block from page" : "Show the block on page")}
              </TooltipContent>
            </Tooltip>
            <ConfirmDeleteSectionDialog
              blockId={id}
              blockName={getBlockDisplayName(data)}
              trigger={
                <span
                  onClick={(event) => event.stopPropagation()}
                  role="button"
                  aria-label={t("Delete")}
                  className="cursor-pointer rounded p-1 hover:bg-black/5">
                  <TrashIcon className="h-3.5 w-3.5" />
                </span>
              }
            />
            <BlockMoreOptions node={node} id={id}>
              <div className="cursor-pointer rounded p-1 hover:bg-black/5">
                <DotsVerticalIcon className="h-3 w-3" />
              </div>
            </BlockMoreOptions>
          </div>
        </div>
      </div>
    </div>
  );
});
