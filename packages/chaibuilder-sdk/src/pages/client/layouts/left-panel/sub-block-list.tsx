import { useAtom } from "jotai";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { treeDSBlocks } from "~/atoms/blocks";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import type { SectionTreeNode } from "./section-groups";
import { SectionTree } from "./section-tree";

const findNode = (nodes: SectionTreeNode[], id: string): SectionTreeNode | undefined => {
  for (const node of nodes) {
    if (node._id === id) return node;
    const found = node.children ? findNode(node.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
};

/**
 * Faza 3 (§4.3): lista podbloków zaznaczonej sekcji z DnD (reużycie `SectionTree`),
 * renderowana pod `SettingsPanel` w dolnym panelu. Klik węzła otwiera jego ustawienia
 * (drill-down); powrót przez `handleBack` (§3.4).
 */
export const SubBlockList = memo(() => {
  const { t } = useTranslation();
  const selectedBlock = useSelectedBlock();
  const [treeData] = useAtom(treeDSBlocks);

  const children = useMemo(() => {
    if (!selectedBlock) return [];
    const node = findNode(treeData, selectedBlock._id);
    return node?.children ?? [];
  }, [treeData, selectedBlock]);

  if (!selectedBlock || children.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Blocks in section")}
        </span>
        <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
          {children.length}
        </span>
      </div>
      <SectionTree data={children} treeKind="blocks" />
    </div>
  );
});
SubBlockList.displayName = "SubBlockList";
