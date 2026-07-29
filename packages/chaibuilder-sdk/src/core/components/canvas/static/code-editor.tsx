import { useThrottledCallback } from "@react-hookz/web";
import { get } from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { LANGUAGES } from "~/core/constants/LANGUAGES";
import { useCodeEditor } from "~/hooks/use-code-editor";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useUpdateBlocksProps, useUpdateBlocksPropsRealtime } from "~/hooks/use-update-blocks-props";

/**
 * Try to fix the HTML code
 * @param html
 */
const sanitizeHTML = (html: string) => {
  const doc = document.createElement("div");
  doc.innerHTML = html;
  return doc.innerHTML;
};

export default function CodeEditor() {
  const { t } = useTranslation();
  const [dirty, setDirty] = useState(false);
  const [code, setCode] = useState("");
  const [codeEditor, setCodeEditor] = useCodeEditor();
  const [ids] = useSelectedBlockIds();
  const updateBlockProps = useUpdateBlocksProps();
  const updateRealTime = useUpdateBlocksPropsRealtime();
  const { selectedLang } = useLanguages();
  const currentLanguage = useMemo(() => get(LANGUAGES, selectedLang, selectedLang), [selectedLang]);
  const saveCodeContentRealTime = useThrottledCallback(
    (value: string) => {
      if (!codeEditor) return;
      const html = sanitizeHTML(value);
      updateRealTime([codeEditor.blockId], { [codeEditor.blockProp]: html });
    },
    [],
    300,
  );

  const saveCodeContent = useCallback(() => {
    if (dirty && codeEditor) {
      const html = sanitizeHTML(code);
      updateBlockProps([codeEditor.blockId], { [codeEditor.blockProp]: html });
    }
  }, [dirty, code, codeEditor]);

  useEffect(() => {
    if (codeEditor && !ids.includes(codeEditor.blockId)) {
      saveCodeContent();
      setCodeEditor(null);
    }
  }, [ids, codeEditor]);

  const handleClose = () => {
    saveCodeContent();
    setCodeEditor(null);
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[400px] min-h-[200px] max-w-4xl flex-col border-gray-700 text-black">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center justify-between text-black">
            <div className="space-x-3 text-sm font-semibold">
              <span>{t("HTML Code Editor")}</span>
              {currentLanguage && <span className="text-xs text-gray-400">({currentLanguage})</span>}
              <span className="text-xs text-gray-400">
                {t("Scripts will be only executed in preview and live mode.")}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Textarea
            className="h-full w-full resize-none font-mono md:text-xs"
            value={codeEditor ? code || codeEditor.initialCode : ""}
            onChange={(e) => {
              const value = e.target.value;
              setDirty(true);
              setCode(value);
              saveCodeContentRealTime(value);
            }}
            rows={10}
            placeholder="Enter your code here..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
