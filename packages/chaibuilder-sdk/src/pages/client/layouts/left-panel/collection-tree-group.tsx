import { ChevronRight, Files, LayoutTemplate } from "lucide-react";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { CmsCollectionVm } from "~/types/collections";

const expandedCollectionsAtom = atomWithStorage<string[]>("expandedCollectionsState", []);

export const useExpandedCollections = () => useAtom(expandedCollectionsAtom);

const CollectionRow = ({
  icon,
  label,
  sublabel,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className="group/row flex h-8 cursor-pointer select-none items-center gap-x-1.5 rounded px-1 text-xs duration-300 hover:bg-muted">
    {icon}
    <span className="min-w-0 truncate font-medium text-slate-700 group-hover/row:text-foreground">{label}</span>
    {sublabel && <span className="truncate font-mono text-[10px] text-muted-foreground">{sublabel}</span>}
    {active && <span className="ml-auto mr-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />}
  </div>
);

const CollectionTreeGroup = ({
  collection,
  onOpenPosts,
  onOpenTemplate,
  activeTemplateId,
}: {
  collection: CmsCollectionVm;
  onOpenPosts: (collectionId: string) => void;
  onOpenTemplate: (templateId: string, collectionId: string) => void;
  activeTemplateId?: string;
}) => {
  const { t } = useTranslation();
  const [expandedCollections, setExpandedCollections] = useExpandedCollections();
  const isExpanded = expandedCollections.includes(collection.id);

  const toggleExpanded = () => {
    setExpandedCollections((prev) =>
      isExpanded ? prev.filter((id) => id !== collection.id) : [...prev, collection.id],
    );
  };

  return (
    <div className="mb-0.5">
      <div
        onClick={toggleExpanded}
        className="flex h-8 cursor-pointer select-none items-center gap-x-1.5 rounded px-1 text-xs duration-300 hover:bg-muted">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          className="flex h-[calc(100%-2px)] w-5 items-center justify-center rounded text-gray-400 transition-colors hover:text-gray-500">
          <ChevronRight
            size={12}
            className={`stroke-[4] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>
        <Files size={12} className="shrink-0 stroke-[1] text-slate-500" />
        <span className="min-w-0 flex-1 truncate font-medium text-black">{collection.name}</span>
        <span className="mr-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
          {collection.postCount}
        </span>
      </div>
      {isExpanded && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          <CollectionRow
            icon={<Files size={12} className="shrink-0 stroke-[1] text-slate-500" />}
            label={t("All posts")}
            sublabel={String(collection.postCount)}
            onClick={() => onOpenPosts(collection.id)}
          />
          {collection.templates.map((template) => (
            <CollectionRow
              key={template.id}
              icon={<LayoutTemplate size={12} className="shrink-0 stroke-[1] text-slate-500" />}
              label={t("Template")}
              sublabel={template.name}
              active={activeTemplateId === template.id}
              onClick={() => onOpenTemplate(template.id, collection.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionTreeGroup;
