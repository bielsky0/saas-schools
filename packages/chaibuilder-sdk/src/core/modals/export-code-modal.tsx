import { camelCase } from "lodash-es";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { useBlocksHtmlForAi } from "~/hooks/use-blocks-html-for-ai";
import { useEditorMode } from "~/hooks/use-editor-mode";
import { usePubSub } from "~/hooks/use-pub-sub";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { ChaiBlock } from "~/types/common";
import { shadcnTheme } from "~/utils/get-chai-builder-tailwind-config";
import { domToJsx, formatHtml } from "./domToJsx";

// Lazy load the CodeDisplay component
const CodeDisplay = lazy(() => import("./code-display"));

async function convertHtmlToJsx(html: string): Promise<{ jsx: string; html: string }> {
  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const children = Array.from(tempDiv.children) as Element[];
    const jsx = domToJsx(children.length === 1 ? children[0] : children);
    return { jsx, html: tempDiv.innerHTML };
  } catch {
    return { html, jsx: html };
  }
}

const getExportedCoded = async ({
  selectedBlock,
  html,
  isTypeScript = false,
}: {
  selectedBlock: ChaiBlock;
  html: string;
  isTypeScript?: boolean;
}) => {
  let componentName = selectedBlock?._name || selectedBlock?._type || "Component";
  componentName = camelCase(componentName).replace(/^./, (str) => str.toUpperCase());

  const SPACE = "  ";
  let { jsx, html: convertedHTML } = await convertHtmlToJsx(html);
  jsx = jsx?.split("\n").join(`\n${SPACE}${SPACE}`);

  // Add TypeScript type annotations if TypeScript is enabled
  const typeAnnotation = isTypeScript ? ": React.FC" : "";
  const importStatement = isTypeScript ? "import React from 'react';\n\n" : "";

  jsx = `${importStatement}export const ${componentName}${typeAnnotation} = () => {
${SPACE}return (
${SPACE}${SPACE}${jsx?.trimEnd()}
${SPACE})
}`;
  return { jsx, html: formatHtml(convertedHTML), componentName };
};

const ExportCodeModalContent = ({ tab }: { tab: string }) => {
  const { t } = useTranslation();
  const [exportContent, setExportContent] = useState<{ html: string; jsx: string }>({ html: "", jsx: "" });
  const selectedBlock = useSelectedBlock();
  const blocksHtmlForAi = useBlocksHtmlForAi();
  const [fileName, setFileName] = useState<string>("");
  const [show, setShow] = useState(false);

  const getFileName = () => {
    switch (tab) {
      case "js":
        return `${fileName}.jsx`;
      case "ts":
        return `${fileName}.tsx`;
      case "html":
        return `${fileName}.html`;
      case "tailwind":
        return "tailwind.config.js";
    }
  };

  const getLanguage = () => {
    switch (tab) {
      case "js":
      case "ts":
        return "javascript";
      case "html":
        return "HTML";
      case "tailwind":
        return "JSON";
    }
  };

  const handleExportEvent = useCallback(async () => {
    const blockForExport: ChaiBlock = selectedBlock ?? ({ _name: "Body", _type: "Body" } as ChaiBlock);
    try {
      setShow(false);
      let html = blocksHtmlForAi(
        selectedBlock
          ? { blockId: selectedBlock._id, additionalCoreBlocks: ["Icon"] }
          : { additionalCoreBlocks: ["Icon"] },
      );
      html = html.replace(/\s*bid=["'][^"']*["']/g, "");

      const isTypeScript = tab === "ts";
      const {
        jsx: jsxCode,
        html: htmlCode,
        componentName,
      } = await getExportedCoded({
        selectedBlock: blockForExport,
        html,
        isTypeScript,
      });
      setExportContent({ html: htmlCode || "", jsx: jsxCode });
      setFileName(componentName);
      setShow(true);
    } catch {
      const fallbackContent = `<div>Export failed. Close the modal and try again.</div>`;
      setExportContent({ html: fallbackContent, jsx: fallbackContent });
      toast.error(t("Failed to generate export HTML"));
    }
  }, [t, tab, selectedBlock, blocksHtmlForAi]);

  useEffect(() => {
    handleExportEvent();
  }, [handleExportEvent, tab]);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        navigator.clipboard.writeText(text);
        toast.success(t("Export code copied!"));
      } catch {
        toast.error(t("Failed to copy export code"));
      }
    },
    [t],
  );

  const downloadExportContent = (content: string) => {
    const blob = new Blob([content], { type: "text/jsx" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getFileName() ?? "";
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
    toast.success(t("Export code downloaded successfully!"));
  };

  const downloadText = (
    <span>
      Download <span className="font-mono text-xs font-light text-gray-300">{getFileName()}</span>
    </span>
  );

  const tailwindConfig = useMemo(() => {
    const theme = { extend: shadcnTheme() };
    const extend = JSON.stringify(theme, null, 2);
    return `{
  // Your tailwind config ...

  "theme": ${extend?.split("\n").join("\n  ")},
}`;
  }, []);

  return exportContent?.jsx?.length > 0 && show ? (
    <CodeDisplay
      key={tab}
      onCopy={handleCopy}
      code={tab === "tailwind" ? tailwindConfig : tab === "html" ? exportContent.html : exportContent.jsx}
      language={getLanguage() || ""}
      downloadText={downloadText}
      onDownload={downloadExportContent}
    />
  ) : (
    <div className="flex h-[620px] w-full items-center justify-center p-4">Generating code...</div>
  );
};

export const ExportCodeModal = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { setMode } = useEditorMode();
  const [tab, setTab] = useState("js");

  const handleOpenModal = useCallback(async () => {
    setTab("js");
    setMode("view");
    setOpen(true);
  }, [setTab, setMode, setOpen]);

  usePubSub(CHAI_BUILDER_EVENTS.OPEN_EXPORT_CODE, handleOpenModal);

  const handleCloseModal = async () => {
    setMode("edit");
    await new Promise((resolve) => setTimeout(resolve, 300));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-5xl overflow-hidden border-border">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-foreground">{t("Export Code")}</DialogTitle>
          <Tabs defaultValue="js" onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="js">Javascript</TabsTrigger>
              <TabsTrigger value="ts">Typescript</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="tailwind">Tailwind config</TabsTrigger>
            </TabsList>
          </Tabs>
          <div />
        </DialogHeader>
        <div className="flex min-h-[400px] flex-col gap-4">
          {open && (
            <Suspense
              fallback={
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  Loading code editor...
                </div>
              }>
              <ErrorBoundary fallback={<div>Something went wrong</div>}>
                <ExportCodeModalContent tab={tab} />
              </ErrorBoundary>
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
