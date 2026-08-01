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
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import AddBlocksPanel from "~/core/components/sidepanels/panels/add-blocks/add-blocks";
import SearchInput from "~/core/components/sidepanels/panels/add-blocks/search-input";
import { Node } from "~/core/components/sidepanels/panels/outline/node";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useLanguages } from "~/hooks/use-languages";
import { usePubSub } from "~/hooks/use-pub-sub";
import { getBlockDefaultProps } from "~/runtime";
import { ChaiBlock } from "~/types/common";
import { ChaiAskAiResponse } from "~/types/chaibuilder-editor-props";
import { filterSections, groupSections, isSectionOverridden, type SectionTreeNode } from "./section-groups";
import { SectionTree } from "./section-tree";

export const addSectionDialogOpenAtom = atom(false);
addSectionDialogOpenAtom.debugLabel = "addSectionDialogOpenAtom";

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
      <Node {...props} />
      {overridden && (
        <span className="pointer-events-none absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded-sm bg-amber-100 px-1 text-[9px] font-medium leading-4 text-amber-700 transition-opacity group-hover:opacity-0">
          {t("Overridden")}
        </span>
      )}
    </div>
  );
});

const GroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div className="mb-1 flex items-center justify-between px-1 pt-2">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">{count}</span>
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

const AddSectionDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(addSectionDialogOpenAtom);

  usePubSub(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl overflow-hidden border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("Add section")}</DialogTitle>
        </DialogHeader>
        <div className="h-[480px] max-h-[70vh] overflow-hidden">
          <AddBlocksPanel parentId={undefined} position={-1} showHeading={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GenerateSectionDialog = () => {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [, setAddDialogOpen] = useAtom(addSectionDialogOpenAtom);
  const [, setGenerateDialogOpen] = useAtom(generateSectionDialogOpenAtom);

  const groups = useMemo(() => groupSections(treeData), [treeData]);

  const searching = searchQuery.trim().length > 0;

  const filteredGroups = useMemo(() => {
    if (!searching) return groups;
    return groups.map((group) => ({ ...group, nodes: filterSections(group.nodes, searchQuery) }));
  }, [groups, searching, searchQuery]);

  const searchNodes = useMemo(
    () => filteredGroups.flatMap((group) => group.nodes),
    [filteredGroups],
  );

  const hasResults = filteredGroups.some((group) => group.nodes.length > 0);
  const isEmptyPage = treeData.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1">
        <div className="min-w-0 flex-1">
          <SearchInput value={searchQuery} setValue={setSearchQuery} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("Add section")}
              className="h-8 w-8 shrink-0 rounded-md"
              onClick={() => setAddDialogOpen(true)}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="isolate z-[9999]">{t("Add section")}</TooltipContent>
        </Tooltip>
      </div>
      <div className="shrink-0 pb-2">
        <Button
          variant="outline"
          className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
          onClick={() => setGenerateDialogOpen(true)}>
          <MagicWandIcon className="h-3.5 w-3.5" />
          {t("Generate section from description")}
        </Button>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {isEmptyPage ? (
          <EmptyPageState onAdd={() => setAddDialogOpen(true)} />
        ) : searching ? (
          hasResults ? (
            <SectionTree data={searchNodes} height={countNodes(searchNodes) * 25 + 16} nodeRenderer={SectionNode} />
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("No sections found")}</p>
          )
        ) : (
          filteredGroups
            .filter((group) => group.nodes.length > 0)
            .map((group) => (
              <div key={group.id}>
                <GroupHeader label={t(group.labelKey)} count={group.nodes.length} />
                <SectionTree data={group.nodes} height={countNodes(group.nodes) * 25 + 16} nodeRenderer={SectionNode} />
              </div>
            ))
        )}
      </div>

      <AddSectionDialog />
      <GenerateSectionDialog />
    </div>
  );
};
