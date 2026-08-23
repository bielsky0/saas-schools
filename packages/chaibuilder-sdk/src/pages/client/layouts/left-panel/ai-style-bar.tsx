import { MagicWandIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { ChaiAskAiResponse } from "~/types/chaibuilder-editor-props";
import type { ChaiBlock } from "~/types/common";

type AskAiCallback = (
  type: "styles" | "content",
  prompt: string,
  blocks: ChaiBlock[],
  lang: string,
) => Promise<ChaiAskAiResponse>;

/**
 * Natural-language style editor stub. When `askAiCallBack` is provided by the
 * app it will drive style changes from a prompt; until then it shows the
 * "under construction" toast (backend AI is wired in a later phase).
 */
export const AiStyleBar = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const block = useSelectedBlock();
  const { fallbackLang } = useLanguages();
  const askAiCallBack = useBuilderProp<AskAiCallback | null>("askAiCallBack", null);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    if (!askAiCallBack) {
      toast.info(t("Feature under construction"));
      return;
    }
    setLoading(true);
    try {
      const response = await askAiCallBack("styles", prompt, block ? [block] : [], fallbackLang);
      if (response?.error) {
        toast.error(t("Something went wrong"));
        return;
      }
      // TODO(backend AI): apply response.blocks (style props) to the block store.
      toast.success(t("Styles applied"));
      setPrompt("");
    } catch {
      toast.error(t("Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 p-2">
      <div className="mb-1.5 flex items-center gap-1 px-0.5 text-[11px] font-medium text-blue-700">
        <MagicWandIcon className="h-3 w-3" />
        <span>{t("Describe how to change the look")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder={t("e.g. darker background and a larger heading")}
          className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button size="sm" className="h-8 shrink-0" onClick={handleSubmit} disabled={loading || !prompt.trim()}>
          {loading ? <ReloadIcon className="h-3.5 w-3.5 animate-spin" /> : <MagicWandIcon className="h-3.5 w-3.5" />}
          <span className="ml-1">{t("Apply")}</span>
        </Button>
      </div>
    </div>
  );
};