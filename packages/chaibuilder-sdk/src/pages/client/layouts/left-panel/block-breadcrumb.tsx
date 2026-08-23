import { useAtomValue } from "jotai";
import { memo, useMemo } from "react";
import { treeDSBlocks } from "~/atoms/blocks";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { blockPathName, findPath } from "./block-path";

const MAX_VISIBLE_SEGMENTS = 3;

/**
 * Breadcrumb trail for the selected block: `Sekcja › Kolumna › Przycisk`.
 * Ancestors are clickable and jump the selection back up the tree (drill-up),
 * the current block is rendered as a static title.
 */
export const BlockBreadcrumb = memo(({ blockId }: { blockId: string }) => {
  const treeData = useAtomValue(treeDSBlocks);
  const [, setBlockIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();

  const path = useMemo(() => findPath(treeData, blockId), [treeData, blockId]);

  if (path.length === 0) return null;

  const goTo = (id: string) => {
    setStyleBlocks([]);
    setBlockIds([id]);
  };

  const overflow = path.length > MAX_VISIBLE_SEGMENTS;
  const visiblePath = overflow ? path.slice(-MAX_VISIBLE_SEGMENTS) : path;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden" aria-label="Block path">
      {overflow && (
        <>
          <span className="shrink-0 text-[12px] leading-5 text-[#8A8A8A]">…</span>
          <span className="shrink-0 text-[12px] leading-5 text-[#8A8A8A]">/</span>
        </>
      )}
      {visiblePath.map((node, index) => {
        const isLast = index === visiblePath.length - 1;
        const name = blockPathName(node);
        if (isLast) {
          return (
            <span
              key={node._id}
              className="min-w-0 truncate text-[14px] font-semibold leading-5 text-[#303030]">
              {name}
            </span>
          );
        }
        return (
          <span key={node._id} className="flex min-w-0 shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => goTo(node._id)}
              className="max-w-[96px] truncate rounded px-1 py-px text-[12px] leading-5 text-[#5A5A5A] hover:bg-black/[.06] hover:text-[#303030]">
              {name}
            </button>
            <span className="shrink-0 text-[12px] leading-5 text-[#8A8A8A]">/</span>
          </span>
        );
      })}
    </div>
  );
});
BlockBreadcrumb.displayName = "BlockBreadcrumb";