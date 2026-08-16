import { MagicWandIcon, PlusIcon, ReloadIcon, StackIcon } from "@radix-ui/react-icons";
import { atom, useAtom } from "jotai";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NodeRendererProps } from "react-arborist";
import { toast } from "sonner";
import { treeDSBlocks } from "~/atoms/blocks";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Node } from "~/core/components/sidepanels/panels/outline/node";
import { useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useLanguages } from "~/hooks/use-languages";
import { getBlockDefaultProps } from "~/runtime";
import { ChaiBlock } from "~/types/common";
import { ChaiAskAiResponse } from "~/types/chaibuilder-editor-props";
import { groupSections, isSectionOverridden, type SectionTreeNode } from "./section-groups";
import { SectionLibrarySheet, sectionLibraryOpenAtom } from "./section-library";
import { SectionTree } from "./section-tree";

export const generateSectionDialogOpenAtom = atom(false);
generateSectionDialogOpenAtom.debugLabel = "generateSectionDialogOpenAtom";

const countNodes = (nodes: SectionTreeNode[]): number =>
  nodes.reduce((sum, node) => sum + 1 + countNodes(node.children ?? []), 0);

type AskAiCallback = (
  type: "styles" | "content",
  prompt: string,
  blocks: ChaiBlock[],
  lang: string,
) => Promise<ChaiAskAiResponse>;

const SectionNode = memo((props: NodeRendererProps<any>) => {
  const { t } = useTranslation();
  const overridden = useMemo(
    () => isSectionOverridden(props.node.data, getBlockDefaultProps(props.node.data._type)),
    [props.node.data],
  );

  return (
    <div className="group relative h-full">
      <Node {...props} showAddBlockLabel />
      {overridden && (
        <span className="pointer-events-none absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded-sm bg-amber-100 px-1 text-[9px] font-medium leading-4 text-amber-700 transition-opacity group-hover:opacity-0">
          {t("Overridden")}
        </span>
      )}
    </div>
  );
});

const GroupHeader = ({ label }: { label: string }) => (
  <div className="flex items-center justify-between py-1 pl-3 pr-1">
    <h3 className="text-[13px] font-semibold leading-5 text-[#303030]">{label}</h3>
  </div>
);

const EmptyPageState = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <StackIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{t("This page is empty")}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {t("Get started by adding your first block to begin building your page")}
      </p>
      <Button onClick={onAdd} className="mt-4" size="sm">
        <PlusIcon className="h-4 w-4" />
        {t("Add section")}
      </Button>
    </div>
  );
};

export const GenerateSectionDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(generateSectionDialogOpenAtom);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askAiCallBack = useBuilderProp<AskAiCallback | null>("askAiCallBack", null);
  const { addBlocks } = useBlocksStoreUndoableActions();
  const { fallbackLang } = useLanguages();

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    if (!askAiCallBack) {
      setError(t("Feature under construction"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = (await askAiCallBack("content", prompt, [], fallbackLang)) as {
        blocks?: ChaiBlock[];
        error?: unknown;
      };
      if (response?.error) {
        setError(t("Feature under construction"));
        return;
      }
      const generatedBlocks = response?.blocks;
      if (!generatedBlocks || generatedBlocks.length === 0) {
        setError(t("Feature under construction"));
        return;
      }
      addBlocks(generatedBlocks);
      toast.success(t("Section generated"));
      setPrompt("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}>
      <DialogContent className="border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("Generate section")}</DialogTitle>
          <DialogDescription>
            {t("Describe the section you want to generate and add it to the page")}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("e.g. A hero section with a headline, subheading and a call to action button")}
          rows={4}
          className="resize-none"
        />
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <ReloadIcon className="h-4 w-4 animate-spin" /> : <MagicWandIcon className="h-4 w-4" />}
            {loading ? t("Generating...") : t("Generate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const SectionsTab = () => {
  const { t } = useTranslation();
  const [treeData] = useAtom(treeDSBlocks);
  const [, setLibraryOpen] = useAtom(sectionLibraryOpenAtom);

  const groups = useMemo(() => groupSections(treeData), [treeData]);

  const isEmptyPage = treeData.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {isEmptyPage ? (
          <EmptyPageState onAdd={() => setLibraryOpen(true)} />
        ) : (
          groups
            .filter((group) => group.nodes.length > 0)
            .map((group) => (
              <div key={group.id} className="mb-6">
                <GroupHeader label={t(group.labelKey)} />
                <SectionTree data={group.nodes} height={countNodes(group.nodes) * 30 + 16} nodeRenderer={SectionNode} />
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="mt-0.5 pl-5 text-xs text-[#005BD3] hover:underline">
                  {t("Add section")}
                </button>
              </div>
            ))
        )}
      </div>

      <SectionLibrarySheet />
    </div>
  );
};
