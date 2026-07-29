import Editor from "@monaco-editor/react";
import { CheckIcon, CopyIcon, DownloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "~/components/ui/button";

interface CodeDisplayProps {
  code: string;
  language: string;
  onCopy: (code: string) => void;
  onDownload: (code: string) => void;
  downloadText?: string | React.ReactNode;
}

export default function CodeDisplay({
  code,
  onCopy,
  language = "javascript",
  onDownload,
  downloadText = "Download",
}: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [editorCode, setEditorCode] = useState(code);

  const handleCopy = () => {
    onCopy(editorCode);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDownload = () => {
    onDownload(editorCode);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[500px] max-h-full overflow-hidden rounded-md border py-2">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={editorCode}
          onChange={(value) => setEditorCode(value || "")}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "off",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            suggest: {
              showKeywords: false,
              showSnippets: false,
            },
          }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleCopy}>
          {copied ? <CheckIcon className="text-green-500" /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" onClick={handleDownload}>
          <DownloadIcon /> {downloadText}
        </Button>
      </div>
    </div>
  );
}
