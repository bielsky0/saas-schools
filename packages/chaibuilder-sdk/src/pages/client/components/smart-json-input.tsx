import { get } from "lodash-es";
import { AlertTriangle, Code, Eye, FileCode2, Plus, Share2 } from "lucide-react";
import { lazy, startTransition, Suspense, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { usePagesProps } from "~/pages/hooks/utils/use-pages-props";
import {
  evaluatePlaceholders,
  JsonError,
  parseJSONWithPlaceholders,
  restorePlaceholders,
} from "~/pages/utils/json-utils";
import Tooltip from "~/pages/utils/tooltip";
import { NestedPathSelector } from "./nested-path-selector/nested-path-selector";
const SharedJsonLD = lazy(() => import("./shared-json-ld/shared-json-ld"));

interface SmartJsonInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  id?: string;
  pageData?: Record<string, any>;
  handleFieldInsert?: (field: string, inputId: string) => void;
  hasJsonLdForSelectedLang?: boolean;
  copyJsonLDFromDefaultPage?: () => void;
}

export const SmartJsonInput: React.FC<SmartJsonInputProps> = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  placeholder = "Enter JSON",
  rows = 6,
  id = "json-input",
  pageData = {},
  handleFieldInsert,
  hasJsonLdForSelectedLang,
  copyJsonLDFromDefaultPage,
}) => {
  const [activeTab, setActiveTab] = useState("edit");
  const [jsonError, setJsonError] = useState<JsonError | null>(null);
  const [previewJson, setPreviewJson] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pagesProps] = usePagesProps();
  const isShareJsonLdEnabled = id === "jsonLD" && get(pagesProps, "flags.sharedJsonLD", false);
  const showOptionToCopyJsonLd = id === "jsonLD" && !hasJsonLdForSelectedLang && !!copyJsonLDFromDefaultPage;

  useEffect(() => {
    if (value.trim() === "") {
      onChange("{}");
    }
  }, [value, onChange]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault(); // Prevent focus from moving to next element

      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // If there's a selection, indent or unindent multiple lines
      if (start !== end) {
        const selectedText = value.substring(start, end);
        const linesArray = selectedText.split("\n");

        if (e.shiftKey) {
          // Unindent (remove 2 spaces from start of each line if present)
          const unindentedLines = linesArray.map((line) => {
            if (line.startsWith("  ")) return line.substring(2);
            return line;
          });
          const newText = unindentedLines.join("\n");
          const newValue = value.substring(0, start) + newText + value.substring(end);
          onChange(newValue);

          // Maintain selection
          setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + newText.length;
          }, 0);
        } else {
          // Indent (add 2 spaces to start of each line)
          const indentedLines = linesArray.map((line) => `  ${line}`);
          const newText = indentedLines.join("\n");
          const newValue = value.substring(0, start) + newText + value.substring(end);
          onChange(newValue);

          // Maintain selection
          setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + newText.length;
          }, 0);
        }
      } else {
        // No selection - insert 2 spaces at cursor position
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);

        // Move cursor after inserted spaces
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  useEffect(() => {
    // Analyze the JSON when the value changes
    const result = parseJSONWithPlaceholders(value);

    if (result.isValid) {
      startTransition(() => {
        setJsonError(null);

        if (result.parsed) {
          // For preview with evaluated placeholders
          const evaluated = evaluatePlaceholders(result.parsed, pageData);
          setPreviewJson(evaluated);
        } else {
          setPreviewJson("");
        }
      });
    } else {
      startTransition(() => {
        setJsonError(result.error);
        setPreviewJson("");
      });
    }
  }, [value, pageData]);

  const handleFormat = () => {
    const result = parseJSONWithPlaceholders(value);
    if (result.isValid && result.parsed) {
      const formatted = restorePlaceholders(result.parsed, result.placeholders);
      onChange(formatted);
    }
  };

  const highlightError = () => {
    if (jsonError?.position && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(jsonError.position, jsonError.position + 1);
    }
  };

  return (
    <ErrorBoundary fallback={<div>Some error</div>}>
      <div className="space-y-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-2 flex items-center justify-between">
            <TabsList className="w-max">
              <TabsTrigger value="edit" className="flex items-center gap-1">
                <Code className="h-4 w-4" />
                <span>Edit</span>
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="flex items-center gap-1"
                disabled={!value.trim() || jsonError !== null || showOptionToCopyJsonLd}>
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </TabsTrigger>
              {isShareJsonLdEnabled && (
                <TabsTrigger
                  value="shared"
                  className="flex items-center gap-1"
                  disabled={!value.trim() || jsonError !== null}>
                  <Share2 className="h-4 w-4" />
                  <span>Shared</span>
                </TabsTrigger>
              )}
            </TabsList>

            {showOptionToCopyJsonLd
              ? null
              : activeTab === "edit" &&
                !readOnly && (
                  <div className="flex items-center gap-2">
                    <NestedPathSelector
                      dataType="value"
                      data={pageData ?? {}}
                      onSelect={(field) => handleFieldInsert && handleFieldInsert(field, id)}
                    />
                  </div>
                )}
          </div>

          <TabsContent value="edit" className="relative mt-0">
            {!showOptionToCopyJsonLd && activeTab === "edit" && (
              <Tooltip content="Format JSON" side="right" showTooltip={!disabled && !jsonError}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleFormat}
                  className="absolute right-1 top-1 h-6 w-6 p-1"
                  disabled={!value.trim() || disabled || jsonError !== null}>
                  <FileCode2 />
                </Button>
              </Tooltip>
            )}
            {showOptionToCopyJsonLd ? (
              <div className="flex h-40 items-center justify-center rounded-md bg-black/20">
                <div className="flex max-w-[400px] flex-col items-center gap-2 rounded-md bg-white p-4 shadow-lg">
                  <div className="max-w-xl text-center text-xs text-gray-500">
                    JSON-LD for is not added for selected language. JSON LD will be used from default language.
                  </div>
                  <Button type="button" variant="default" size="sm" onClick={copyJsonLDFromDefaultPage}>
                    <Plus />
                    Copy & Edit from default language
                  </Button>
                </div>
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                id={id}
                name={id}
                className={`rounded-md border border-input text-xs ${jsonError ? "border-red-500" : ""}`}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                value={value}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                readOnly={readOnly}
              />
            )}

            {jsonError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex flex-col">
                  <span className="font-medium">Invalid JSON</span>
                  <span className="text-sm">{jsonError.message}</span>
                  {jsonError.line && jsonError.column && (
                    <span className="text-sm">
                      Error at line {jsonError.line}, column {jsonError.column}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto self-start p-0 text-sm"
                    onClick={highlightError}>
                    Show position
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <Textarea rows={rows} value={previewJson} readOnly className="cursor-default bg-muted font-mono text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">
              This is how the JSON will look after placeholder substitution.
            </p>
          </TabsContent>

          {isShareJsonLdEnabled && (
            <TabsContent value="shared" className="mt-0">
              <Suspense>
                <SharedJsonLD />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};
