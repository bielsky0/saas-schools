import { atom, Atom, Provider, useAtom, useAtomValue } from "jotai";
import { splitAtom } from "jotai/utils";
import { filter, get, has, isArray, isEmpty, isNull, isString, map, noop } from "lodash-es";
import React, { createContext, createElement, Suspense, useCallback, useContext, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { pageBlocksAtomsAtom } from "~/atoms/blocks";
import { chaiDesignTokensAtom, usePageExternalData } from "~/atoms/builder";
import { builderStore } from "~/atoms/store";
import { dataBindingActiveAtom } from "~/atoms/ui";
import { useIsDragAndDropEnabled } from "~/core/components/canvas/dnd/drag-and-drop/hooks";
import { useDirectBlockDrag } from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-direct-block-drag";
import {
  applyLanguage,
  applyLimit,
  getBlockRuntimeProps,
  getBlockTagAttributes,
} from "~/core/components/canvas/static/new-blocks-render-helpers";
import { useBlockRuntimeProps } from "~/core/components/canvas/static/use-block-runtime-props";
import { MAX_PARTIAL_DEPTH } from "~/core/constants/partial-blocks";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useEditorMode } from "~/hooks/use-editor-mode";
import { useInlineEditing } from "~/hooks/use-inline-editing";
import { useLanguages } from "~/hooks/use-languages";
import { usePartialBlocksStore } from "~/hooks/use-partial-blocks-store";
import { useSavePage } from "~/hooks/use-save-page";
import { useGetBlockAtom } from "~/hooks/use-update-block-atom";
import { applyBindingToBlockProps } from "~/render/apply-binding";
import { resolveBinding } from "~/render/binding-engine";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlock } from "~/types/common";
import { adjustSpacingInContentBlocks } from "./adjust-spacing-in-blocks";
import { MayBeAsyncPropsWrapper } from "./async-props-wrapper";
import { ErrorFallback } from "./error-fallback";
import WithBlockTextEditor from "./with-block-text-editor";

export const RepeaterContext = createContext<{
  index: number;
  key: string;
}>({
  index: -1,
  key: "",
});

export const PartialDepthContext = createContext<number>(0);

const CORE_BLOCKS = [
  "Box",
  "Repeater",
  "GlobalBlock",
  "PartialBlock",
  "Heading",
  "Text",
  "RichText",
  "Span",
  "Image",
  "Button",
  "Paragraph",
  "Link",
  "Video",
  "Audio",
  "Icon",
  "List",
  "ListItem",
  "CustomScript",
  "CustomHTML",
];

const BlockRenderer = ({
  asyncProps,
  blockAtom,
  children,
}: {
  blockAtom: Atom<ChaiBlock>;
  asyncProps: Record<string, any>;
  children: ({
    _id,
    _type,
    $repeaterItemsKey,
    repeaterItems,
    partialBlockId,
  }: {
    _id: string;
    _type: string;
    $repeaterItemsKey?: string;
    repeaterItems?: any;
    partialBlockId?: string;
  }) => React.ReactNode;
}) => {
  const { editingBlockId, editingItemIndex } = useInlineEditing();
  const [block] = useAtom(blockAtom);
  const registeredChaiBlock = useMemo(() => getRegisteredChaiBlock(block._type) as any, [block._type]);
  const { selectedLang, fallbackLang } = useLanguages();
  const getRuntimePropValues = useBlockRuntimeProps();
  const pageExternalData = usePageExternalData();
  const [dataBindingActive] = useAtom(dataBindingActiveAtom);
  const Component = get(registeredChaiBlock, "component", null);
  const { index, key } = useContext(RepeaterContext);
  const { mode } = useEditorMode();
  const designTokens = useAtomValue(chaiDesignTokensAtom);

  // Enable direct drag-and-drop for blocks in edit mode
  const isDragAndDropEnabled = useIsDragAndDropEnabled();
  const isEditMode = mode === "edit";
  const directDragHandlers = useDirectBlockDrag();

  const dataBindingProps = useMemo(
    () =>
      dataBindingActive
        ? applyBindingToBlockProps(applyLanguage(block, selectedLang, registeredChaiBlock), pageExternalData, {
            index,
            key,
          })
        : applyLanguage(block, selectedLang, registeredChaiBlock),
    [block, selectedLang, registeredChaiBlock, pageExternalData, dataBindingActive, index, key],
  );

  const blockAttributesProps = useMemo(
    () => getBlockTagAttributes(block, true, designTokens),
    [block, getBlockTagAttributes, designTokens],
  );

  const runtimeProps = useMemo(
    () => getRuntimePropValues(block._id, getBlockRuntimeProps(block._type)),
    [block._id, block._type, getRuntimePropValues, getBlockRuntimeProps],
  );

  // Prepare blockProps with drag handlers if DnD is enabled
  const blockProps = useMemo(() => {
    const baseProps = {
      "data-block-id": block._id,
      "data-block-type": block._type,
      "data-block-index": index,
    };

    // Add drag handlers if DnD is enabled in edit mode
    if (isEditMode && isDragAndDropEnabled) {
      const propsWithDrag = {
        ...baseProps,
        draggable: !editingBlockId,
        onMouseDown: directDragHandlers.onMouseDown,
        onDragStart: directDragHandlers.onDragStart,
        onDragEnd: directDragHandlers.onDragEnd,
      };
      return propsWithDrag;
    }

    return baseProps;
  }, [block._id, block._type, index, isEditMode, isDragAndDropEnabled, directDragHandlers, editingBlockId]);

  const props = useMemo(
    () => ({
      blockProps,
      inBuilder: mode === "edit",
      lang: selectedLang || fallbackLang,
      pageData: pageExternalData,
      ...dataBindingProps,
      ...blockAttributesProps,
      ...runtimeProps,
      ...asyncProps,
    }),
    [mode, blockProps, selectedLang, fallbackLang, dataBindingProps, blockAttributesProps, runtimeProps, asyncProps],
  );
  const needErrorBoundary = useMemo(() => !CORE_BLOCKS.includes(block._type), [block._type]);
  const isShown = useMemo(() => {
    const show = get(block, "_show", true);
    if (isString(show)) {
      if (!dataBindingActive) return true;
      const resolved = resolveBinding(show, pageExternalData);
      return resolved !== "false";
    }
    return show;
  }, [block, dataBindingActive, pageExternalData]);
  if (isNull(Component) || !isShown) return null;
  let blockNode = (
    <Suspense>
      {createElement(Component, {
        ...props,
        children: children({
          _id: block._id,
          _type: block._type,
          ...(isArray(dataBindingProps.repeaterItems)
            ? {
                repeaterItems: applyLimit(dataBindingProps.repeaterItems, block),
                $repeaterItemsKey: dataBindingProps.$repeaterItemsKey,
              }
            : {}),
          ...(block.partialBlockId ? { partialBlockId: block.partialBlockId } : ""),
          ...(block.globalBlock ? { partialBlockId: block.globalBlock } : ""),
        }),
      })}
    </Suspense>
  );

  const blockNodeWithTextEditor =
    editingBlockId === block._id && (editingItemIndex === index || index < 0) ? (
      <WithBlockTextEditor block={block}>{blockNode}</WithBlockTextEditor>
    ) : (
      blockNode
    );

  return needErrorBoundary ? (
    <ErrorBoundary fallbackRender={ErrorFallback}>{blockNodeWithTextEditor}</ErrorBoundary>
  ) : (
    blockNodeWithTextEditor
  );
};

const PartialWrapper = ({ children, partialBlockId }: { children: React.ReactNode; partialBlockId: string }) => {
  const gotoPage = useBuilderProp("gotoPage", noop);
  const { saveState } = useSavePage();
  const { selectedLang, fallbackLang } = useLanguages();
  const onDoubleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (saveState !== "SAVED") {
        toast.error("You have unsaved changes. Please save the page first.");
        return;
      }
      gotoPage({ pageId: partialBlockId, lang: selectedLang || fallbackLang });
    },
    [saveState, gotoPage, partialBlockId, selectedLang, fallbackLang],
  );
  return (
    <>
      {children}
      <div className="partial-overlay group absolute inset-0 z-50">
        <div
          onDoubleClick={onDoubleClick}
          className="flex h-full w-full items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100 group-hover:backdrop-opacity-85">
          <p className="rounded-md bg-white px-2 py-1 text-xs">Partial block. Double click to edit.</p>
        </div>
      </div>
    </>
  );
};

const PartialDepthExceededPlaceholder = () => (
  <div className="flex items-center justify-center rounded-md border border-destructive bg-destructive/10 p-4 text-center text-sm text-destructive">
    <p>Maximum partial nesting depth ({MAX_PARTIAL_DEPTH} levels) exceeded</p>
  </div>
);

const PartialBlocksRenderer = ({ partialBlockId }: { partialBlockId: string }) => {
  const { getPartialBlocks } = usePartialBlocksStore();
  const currentDepth = useContext(PartialDepthContext);
  const partialBlocks = useMemo(() => getPartialBlocks(partialBlockId), [getPartialBlocks, partialBlockId]);
  const partialBlocksAtoms = useMemo(() => splitAtom(atom(partialBlocks)), [partialBlocks]);

  // Check if max depth exceeded
  if (currentDepth >= MAX_PARTIAL_DEPTH) {
    return <PartialDepthExceededPlaceholder />;
  }

  if (isEmpty(partialBlocks)) return null;
  return (
    <PartialDepthContext.Provider value={currentDepth + 1}>
      <PartialWrapper partialBlockId={partialBlockId}>
        <BlocksRenderer splitAtoms={partialBlocksAtoms} blocks={partialBlocks} type="PartialBlock" />
      </PartialWrapper>
    </PartialDepthContext.Provider>
  );
};

const BlocksRenderer = ({
  blocks,
  parent = null,
  splitAtoms = undefined,
  type = "",
}: {
  splitAtoms?: any;
  blocks: ChaiBlock[];
  parent?: string | null;
  type?: string;
}) => {
  const getBlockAtom = useGetBlockAtom(splitAtoms);
  let filteredBlocks = useMemo(
    () =>
      filter(blocks, (block) => has(block, "_id") && (!isEmpty(parent) ? block._parent === parent : !block._parent)),
    [blocks, parent],
  );
  const hasChildren = useCallback(
    (blockId: string) => filter(blocks, (b) => b._parent === blockId).length > 0,
    [blocks],
  );

  if (type === "Heading" || type === "Paragraph" || type === "Link") {
    filteredBlocks = adjustSpacingInContentBlocks(filteredBlocks);
  }

  return map(filteredBlocks, (block) => {
    const blockAtom = getBlockAtom(block._id);
    if (!blockAtom) return null;
    return (
      <MayBeAsyncPropsWrapper key={block._id} block={block}>
        {(asyncProps) => (
          <BlockRenderer blockAtom={blockAtom} asyncProps={asyncProps}>
            {({ _id, _type, partialBlockId, repeaterItems, $repeaterItemsKey }) => {
              return _type === "Repeater" ? (
                isArray(repeaterItems) &&
                  repeaterItems.map((_, index) => (
                    <RepeaterContext.Provider key={`${_id}-${index}`} value={{ index, key: $repeaterItemsKey! }}>
                      <BlocksRenderer splitAtoms={splitAtoms} blocks={blocks} parent={block._id} type={_type} />
                    </RepeaterContext.Provider>
                  ))
              ) : _type === "GlobalBlock" || _type === "PartialBlock" ? (
                <Provider store={builderStore}>
                  <PartialBlocksRenderer partialBlockId={partialBlockId!} />
                </Provider>
              ) : hasChildren(_id) ? (
                <BlocksRenderer splitAtoms={splitAtoms} blocks={blocks} parent={block._id} type={_type} />
              ) : null;
            }}
          </BlockRenderer>
        )}
      </MayBeAsyncPropsWrapper>
    );
  });
};

export const PageBlocksRenderer = () => {
  const [blocks] = useBlocksStore();
  return <BlocksRenderer splitAtoms={pageBlocksAtomsAtom} blocks={blocks} />;
};
