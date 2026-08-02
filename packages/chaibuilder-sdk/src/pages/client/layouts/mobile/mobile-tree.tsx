import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type SectionTreeNode } from "../left-panel/section-groups";

const getIcon = (type: string): string => {
  switch (type) {
    case "Navbar":
    case "Header":
    case "Nav":
    case "Navigation":
    case "StickyHeader":
    case "Announcement":
      return "▭";
    case "Footer":
    case "FooterNav":
      return "▬";
    default:
      return "▦";
  }
};

interface MobileTreeProps {
  data: SectionTreeNode[];
  onSelect: (nodeId: string) => void;
  maxHeight?: number;
  depth?: number;
}

export const MobileTree = ({ data, onSelect, maxHeight = 260, depth = 0 }: MobileTreeProps) => {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    const build = (nodes: SectionTreeNode[], level: number): SectionTreeNode[] =>
      nodes.flatMap((node) => [
        node,
        ...(node.children ? build(node.children, level + 1) : []),
      ]);
    return build(data, depth);
  }, [data, depth]);

  return (
    <div
      className="no-scrollbar overflow-y-auto rounded-md border border-gray-100"
      style={{ maxHeight }}>
      {rows.length === 0 && <p className="px-2.5 py-3 text-xs text-muted-foreground">{t("No blocks")}</p>}
      {rows.map((node) => {
        const level = node._parent ? depth + 1 : depth;
        return (
          <button
            key={node._id}
            type="button"
            data-node-id={node._id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node._id);
            }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[13px] text-gray-900 transition-colors hover:bg-gray-100"
            style={{ paddingLeft: `${8 + level * 12}px` }}>
            <span className="w-4 shrink-0 text-[10px] leading-none text-gray-400">{getIcon(node._type ?? "")}</span>
            <span className="min-w-0 flex-1 truncate">{node._name || node._type}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          </button>
        );
      })}
    </div>
  );
};

export default MobileTree;
