import { MagicWandIcon } from "@radix-ui/react-icons";
import { useAtom } from "jotai";
import { Filter, LayoutTemplate } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { treeDSBlocks } from "~/atoms/blocks";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { UndoRedo } from "~/core/components/canvas/topbar/undo-redo";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { PreviewButton } from "~/pages/client/components/topbar-right";
import { GenerateSectionDialog, generateSectionDialogOpenAtom } from "../left-panel/sections-tab";
import { groupSections } from "../left-panel/section-groups";
import { MobileTree } from "./mobile-tree";
import { inspectorEnabledAtom, mobileSheetAtom } from "./mobile-sheet-states";

const MenuRow = ({ icon, label, onClick, hint }: { icon: React.ReactNode; label: string; onClick?: () => void; hint?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-gray-900 transition-colors hover:bg-gray-100">
    <span className="shrink-0 text-gray-500">{icon}</span>
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {hint && <span className="shrink-0 text-[11px] text-muted-foreground">{hint}</span>}
  </button>
);

export const MobileMenu = () => {
  const { t } = useTranslation();
  const [, setMobileSheet] = useAtom(mobileSheetAtom);
  const [inspectorEnabled, setInspectorEnabled] = useAtom(inspectorEnabledAtom);
  const [treeData] = useAtom(treeDSBlocks);
  const [, setGenerateDialogOpen] = useAtom(generateSectionDialogOpenAtom);
  const [, setIds] = useSelectedBlockIds();

  const groups = useMemo(() => groupSections(treeData).filter((group) => group.nodes.length > 0), [treeData]);

  const handleSelectSection = (nodeId: string) => {
    setIds([nodeId]);
    setMobileSheet("settings");
  };

  return (
    <div className="no-scrollbar flex max-h-full flex-col overflow-y-auto">
      <div className="space-y-0.5">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t(group.labelKey)} · {group.nodes.length}
            </div>
            <MobileTree data={group.nodes} onSelect={handleSelectSection} />
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">{t("This page is empty")}</p>
        )}
      </div>

      <Separator className="my-2" />

      <MenuRow
        icon={<MagicWandIcon className="h-4 w-4" />}
        label={t("Generate section from description")}
        onClick={() => setGenerateDialogOpen(true)}
      />

      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <Filter className="h-4 w-4 shrink-0 text-gray-500" />
        <span className="min-w-0 flex-1 text-[13px] text-gray-900">{t("Inspector")}</span>
        <span className="text-[11px] text-muted-foreground">{t("Coming soon")}</span>
        <Switch checked={inspectorEnabled} onCheckedChange={setInspectorEnabled} />
      </div>

      <Separator className="my-2" />

      <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("Undo / Redo")}
      </div>
      <div className="flex items-center gap-1 px-1">
        <UndoRedo />
      </div>

      <Separator className="my-2" />

      <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("MORE")}
      </div>
      <MenuRow icon={<LayoutTemplate className="h-4 w-4" />} label={t("Theme settings")} onClick={() => setMobileSheet("theme")} />
      <MenuRow icon={<Filter className="h-4 w-4" />} label={t("Pages")} onClick={() => setMobileSheet("pages")} />
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <span className="min-w-0 flex-1 text-[13px] text-gray-900">{t("Live preview")}</span>
        <PreviewButton />
      </div>

      <GenerateSectionDialog />
    </div>
  );
};

export default MobileMenu;
