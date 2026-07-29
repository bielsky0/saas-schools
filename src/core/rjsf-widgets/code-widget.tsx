import { WidgetProps } from "@rjsf/utils";
import { get, includes } from "lodash-es";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { LANGUAGES } from "~/core/constants/LANGUAGES";
import { useCodeEditor } from "~/hooks/use-code-editor";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlockConfig } from "~/types";
import { ChaiBlock } from "~/types/common";

const CodeEditor = ({ id, placeholder }: WidgetProps) => {
  const { t } = useTranslation();
  const [, setCodeEditor] = useCodeEditor();
  const { selectedLang } = useLanguages();
  const selectedBlock = useSelectedBlock() as ChaiBlock;
  const blockProp = id.replace("root.", "");
  const registeredBlock = getRegisteredChaiBlock(selectedBlock?._type) as ChaiBlockConfig;
  const hasI18n = includes(get(registeredBlock, "i18nProps", []), blockProp);
  const blockPropWithLang = hasI18n ? (selectedLang ? `${blockProp}-${selectedLang}` : blockProp) : blockProp;
  const value = get(selectedBlock, blockPropWithLang, "");
  const currentLanguage = useMemo(() => get(LANGUAGES, selectedLang, selectedLang), [selectedLang]);

  const openCodeEditor = () => {
    const blockId = selectedBlock?._id;
    setCodeEditor({ blockId, blockProp: blockPropWithLang, placeholder, initialCode: value });
  };

  return (
    <div className={"mt-2 flex flex-col gap-y-1"}>
      <label htmlFor={id}>
        HTML Code
        {currentLanguage && <small className="text-[9px] text-zinc-400">&nbsp;{currentLanguage}</small>}
      </label>
      <button
        onClick={openCodeEditor}
        className="w-[90%] max-w-full cursor-default truncate text-pretty rounded border border-border bg-background p-2 text-left text-[10px]">
        {value.trim().length > 0
          ? value.substring(0, 46)
          : placeholder || "Eg: <script>console.log('Hello, world!');</script>"}
      </button>
      <Button onClick={openCodeEditor} size={"sm"} variant={"outline"} className={"w-fit"}>
        {t("Open code editor")}
      </Button>
    </div>
  );
};

export { CodeEditor };
