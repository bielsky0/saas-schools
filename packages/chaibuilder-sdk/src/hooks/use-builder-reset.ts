import { useAtom } from "jotai";
import { userActionsCountAtom } from "~/atoms/builder";
import { aiAssistantActiveAtom } from "~/atoms/ui";
import { useBlockRepeaterDataAtom } from "~/hooks/async-props/use-async-props";
import { useUndoManager } from "~/hooks/history/use-undo-manager";
import { useBlockHighlight } from "~/hooks/use-block-highlight";
import { usePartialBlocksStore } from "~/hooks/use-partial-blocks-store";
import { useSavePage } from "~/hooks/use-save-page";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";

export const useBuilderReset = () => {
  const { clear } = useUndoManager();
  const [, setSelectedIds] = useSelectedBlockIds();
  const { clearHighlight } = useBlockHighlight();
  const [, setStylingHighlighted] = useSelectedStylingBlocks();
  const [, setAiAssistantActive] = useAtom(aiAssistantActiveAtom);
  const { reset: resetPartialBlocks } = usePartialBlocksStore();
  const { setSaveState } = useSavePage();
  const [, setBlockRepeaterDataAtom] = useBlockRepeaterDataAtom();
  const [, setActionsCount] = useAtom(userActionsCountAtom);

  return () => {
    setBlockRepeaterDataAtom({});
    setSelectedIds([]);
    setStylingHighlighted([]);
    clearHighlight();
    clear();
    setAiAssistantActive(false);
    resetPartialBlocks();
    setSaveState("SAVED");
    setActionsCount(0);
  };
};
