import { CheckIcon, CopyIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { useAtomValue } from "jotai";
import { first, get, isEmpty, isFunction, map } from "lodash-es";
import { useMemo, useRef, useState } from "react";
import Autosuggest from "react-autosuggest";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { chaiDesignTokensAtom } from "~/atoms/builder";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { DesignTokensIcon } from "~/core/components/sidepanels/panels/design-tokens/DesignTokensIcon";
import { useFuseSearch } from "~/core/constants/CLASSES_LIST";
import { DESIGN_TOKEN_PREFIX } from "~/core/constants/STRINGS";
import { getSplitChaiClasses } from "~/hooks/get-split-classes";
import { useAddClassesToBlocks } from "~/hooks/use-add-classes-to-blocks";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useRemoveClassesFromBlocks } from "~/hooks/use-remove-classes-from-blocks";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";

export function ManualClasses({
  from = "default",
  classFromProps,
  onAddNew,
  onRemove,
  showDesignTokenSuggestions = true,
}: {
  from?: "default" | "designToken";
  classFromProps?: string;
  onAddNew?: any;
  onRemove?: any;
  showDesignTokenSuggestions?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingClass, setEditingClass] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [editingClassIndex, setEditingClassIndex] = useState(-1);
  const isSelectingSuggestion = useRef(false);
  const fuse = useFuseSearch();
  const { t } = useTranslation();
  const [styleBlock] = useSelectedStylingBlocks();
  const block = useSelectedBlock();
  const addClassesToBlocks = useAddClassesToBlocks();
  const removeClassesFromBlocks = useRemoveClassesFromBlocks();
  const [selectedIds] = useSelectedBlockIds();
  const [newCls, setNewCls] = useState("");
  const designTokens = useAtomValue(chaiDesignTokensAtom);
  const prop = first(styleBlock)?.prop as string;
  const { classes: classesString } = getSplitChaiClasses(get(block, prop, ""));
  const classesSource = from === "default" ? classesString : (classFromProps ?? "");
  const classes = classesSource.split(" ").filter((cls) => !isEmpty(cls));

  // Sort classes to ensure design tokens ({DESIGN_TOKEN_PREFIX{id}) are always first
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      // Design tokens ({DESIGN_TOKEN_PREFIX}-{id}) should come first
      const aIsDesignToken = a.startsWith(DESIGN_TOKEN_PREFIX);
      const bIsDesignToken = b.startsWith(DESIGN_TOKEN_PREFIX);

      if (aIsDesignToken && !bIsDesignToken) return -1;
      if (!aIsDesignToken && bIsDesignToken) return 1;

      // If both are design tokens or both are regular classes, maintain original order
      return 0;
    });
  }, [classes]);
  const enableCopyToClipboard = useBuilderProp("flags.copyPaste", true);

  const renderClassBadge = (cls: string) => {
    const isDesignToken = cls.startsWith(DESIGN_TOKEN_PREFIX);
    const badge = (
      <div key={cls} className="group relative flex max-w-[260px] items-center">
        <button
          onDoubleClick={() => {
            setNewCls(getDisplayName(cls));
            if (from === "default") {
              removeClassesFromBlocks(selectedIds, [cls], true);
            } else {
              if (isFunction(onRemove)) onRemove(cls);
              setNewCls(cls);
            }
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 10);
          }}
          className="flex h-max cursor-default items-center gap-x-1 truncate break-words rounded bg-gray-200 py-px pl-0.5 pr-1 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <div className="z-10 flex h-full w-max items-center justify-center">
            <Cross2Icon
              onClick={() => {
                if (from === "default") {
                  removeClassesFromBlocks(selectedIds, [cls], true);
                } else if (isFunction(onRemove)) {
                  onRemove(cls);
                }
              }}
              className="hidden h-max w-3.5 cursor-pointer rounded bg-gray-100 p-0.5 text-red-500 hover:bg-gray-50 group-hover:block"
            />
            <svg
              className="h-3.5 w-3.5 group-hover:hidden"
              fill="rgba(55, 65, 81, 0.4)"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              xmlSpace="preserve">
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 6.036c-2.667 0-4.333 1.325-5 3.976 1-1.325 2.167-1.822 3.5-1.491.761.189 1.305.738 1.906 1.345C13.387 10.855 14.522 12 17 12c2.667 0 4.333-1.325 5-3.976-1 1.325-2.166 1.822-3.5 1.491-.761-.189-1.305-.738-1.907-1.345-.98-.99-2.114-2.134-4.593-2.134zM7 12c-2.667 0-4.333 1.325-5 3.976 1-1.326 2.167-1.822 3.5-1.491.761.189 1.305.738 1.907 1.345.98.989 2.115 2.134 4.594 2.134 2.667 0 4.333-1.325 5-3.976-1 1.325-2.167 1.822-3.5 1.491-.761-.189-1.305-.738-1.906-1.345C10.613 13.145 9.478 12 7 12z"></path>
              </g>
            </svg>
          </div>
          <div>{getDisplayName(cls)}</div>
        </button>
      </div>
    );

    if (isDesignToken && designTokens[cls]) {
      return (
        <Tooltip key={cls} delayDuration={200}>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <p className="font-light">{designTokens[cls].value}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return badge;
  };

  // Helper function to get display name for classes
  const getDisplayName = (cls: string) => {
    if (cls.startsWith(DESIGN_TOKEN_PREFIX)) {
      const token = designTokens[cls];
      return token ? token.name : cls;
    }
    return cls;
  };

  // Helper function to convert design token names back to DESIGN_TOKEN_PREFIX-{id} format
  const convertToStorageFormat = (className: string) => {
    // Check if this className matches any design token name
    const tokenEntry = Object.entries(designTokens).find(([, token]) => token.name === className);
    if (tokenEntry) {
      return `${tokenEntry[0]}`; // Return DESIGN_TOKEN_PREFIX-{id} format
    }
    return className; // Return as-is if not a design token
  };

  const addNewClasses = () => {
    const fullClsNames: string[] = newCls
      .trim()
      .replace(/ +(?= )/g, "")
      .split(" ")
      .map(convertToStorageFormat); // Convert design token names to DESIGN_TOKEN_PREFIX-{id} format

    if (from === "designToken") {
      if (isFunction(onAddNew)) onAddNew(fullClsNames);
    } else {
      addClassesToBlocks(selectedIds, fullClsNames, true);
    }
    setNewCls("");
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const designTokensEnabled = useBuilderProp("flags.designTokens", true);
  const handleSuggestionsFetchRequested = ({ value }: any) => {
    const search = value.trim().toLowerCase();
    const matches = search.match(/.+:/g);
    let classMatches = [];

    // Get design token suggestions
    let designTokenSuggestions: {
      name: string;
      id: string;
      isDesignToken: boolean;
    }[] = [];
    if (designTokensEnabled && showDesignTokenSuggestions) {
      if (search === "") {
        // Show all design tokens when no search term
        designTokenSuggestions = Object.entries(designTokens).map(([id, token]) => ({
          name: token.name,
          id: `${id}`,
          isDesignToken: true,
        }));
      } else {
        // Filter design tokens by search term
        designTokenSuggestions = Object.entries(designTokens)
          .filter(([, token]) => token.name.toLowerCase().includes(search))
          .map(([id, token]) => ({
            name: token.name,
            id: `${id}`,
            isDesignToken: true,
          }));
      }
    }
    if (matches && matches.length > 0) {
      const [prefix] = matches;
      const searchWithoutPrefix = search.replace(prefix, "");
      const fuseResults = fuse.search(searchWithoutPrefix);
      classMatches = fuseResults.map((result: any) => ({
        ...result,
        item: { ...result.item, name: prefix + result.item.name },
      }));
    } else {
      classMatches = fuse.search(search);
    }

    // Combine design tokens with regular class suggestions, design tokens first
    const allSuggestions = [...designTokenSuggestions, ...map(classMatches, "item")];
    return setSuggestions(allSuggestions);
  };

  const handleSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion: any) => {
    return suggestion.name; // Always return the display name
  };

  const renderSuggestion = (suggestion: any) => (
    <div className="flex items-center gap-2 rounded-md p-1">
      {suggestion.isDesignToken && <DesignTokensIcon className="h-4 w-4 text-gray-600" />}
      <span>{suggestion.name}</span>
    </div>
  );

  const inputProps = useMemo(
    () => ({
      ref: inputRef,
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      spellCheck: false,
      placeholder: `${showDesignTokenSuggestions ? t("Enter classes separated by space or design tokens") : t("Enter classes separated by space")}`,
      value: newCls,
      onFocus: (e: any) => {
        setTimeout(() => {
          if (e.target) e.target.select();
        }, 0);
      },
      onKeyDown: (e: any) => {
        if (e.key === "Enter" && newCls.trim() !== "") {
          if (isSelectingSuggestion.current) {
            isSelectingSuggestion.current = false;
            return;
          }
          e.preventDefault();
          addNewClasses();
        }
        if (e.key === "Tab" && suggestions.length > 0) {
          e.preventDefault();
          // Simulate ArrowDown to highlight
          const downEvent = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            code: "ArrowDown",
            keyCode: 40,
            bubbles: true,
          });
          e.target.dispatchEvent(downEvent);
        }
      },
      onChange: (_e: any, { newValue }: any) => setNewCls(newValue),
      className: `w-full rounded-md text-xs px-2 hover:outline-0 bg-background border-border ${from === "default" ? "py-1" : "py-1.5"}`,
    }),
    [newCls, t, inputRef, suggestions.length],
  );

  const handleEditClass = (clsToRemove: string) => {
    const fullClsNames: string[] = editingClass
      .trim()
      .replace(/ +(?= )/g, "")
      .split(" ")
      .map(convertToStorageFormat); // Convert design token names to DESIGN_TOKEN_PREFIX-{id} format
    removeClassesFromBlocks(selectedIds, [clsToRemove], true);
    addClassesToBlocks(selectedIds, fullClsNames, true);
    setEditingClass("");
    setEditingClassIndex(-1);
  };

  const onClickCopy = () => {
    if (navigator.clipboard === undefined) {
      toast.error(t("Clipboard not supported"));
      return;
    }
    navigator.clipboard.writeText(classes.join(" "));
    toast.success(t("Classes copied to clipboard"));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`flex w-full flex-col gap-y-1.5 pb-4 ${from === "designToken" ? "border-none" : "border-b border-border"}`}>
      <div className="flex items-center justify-between gap-x-2">
        <div className="flex w-full items-center justify-between gap-x-2 text-muted-foreground">
          <span className="flex items-center gap-x-1">
            <span>{t("Classes")}</span>
            {enableCopyToClipboard && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {isCopied ? (
                    <CheckIcon className="rounded-full border border-green-500 bg-green-500/10 text-green-500" />
                  ) : (
                    <CopyIcon onClick={onClickCopy} className={"cursor-pointer"} />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("Copy classes to clipboard")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </span>
        </div>
      </div>
      <div className={"relative flex items-center gap-x-3"}>
        <div className="relative flex w-full items-center gap-x-3">
          <Autosuggest
            suggestions={suggestions}
            onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
            onSuggestionsClearRequested={handleSuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            inputProps={inputProps}
            onSuggestionSelected={(_e, { suggestionValue }) => {
              isSelectingSuggestion.current = true;
              const storageFormat = convertToStorageFormat(suggestionValue);
              const fullClsNames = [storageFormat];
              if (from === "designToken") {
                if (isFunction(onAddNew)) onAddNew(fullClsNames);
              } else {
                addClassesToBlocks(selectedIds, fullClsNames, true);
              }
              setNewCls("");
            }}
            containerProps={{
              className: "relative h-8 w-full gap-y-1 py-1 border-border text-xs",
            }}
            theme={{
              suggestion: "bg-transparent",
              suggestionHighlighted: "!bg-gray-300 dark:!bg-gray-800 cursor-pointer",
              suggestionsContainerOpen:
                "absolute bg-background no-scrollbar z-50 max-h-[230px] overflow-y-auto w-full  border border-border rounded-md",
            }}
          />
        </div>
        <Button
          variant="outline"
          className={`border-border ${from === "default" ? "h-6" : "mt-1 h-7"}`}
          onClick={addNewClasses}
          disabled={newCls.trim() === ""}
          size="sm">
          <PlusIcon />
        </Button>
      </div>
      <div className="flex w-full flex-wrap gap-2 overflow-x-hidden">
        {sortedClasses.map((cls: string, index: number) =>
          editingClassIndex === index ? (
            <input
              ref={inputRef}
              key={cls}
              value={editingClass}
              onChange={(e) => setEditingClass(e.target.value)}
              onBlur={() => {
                handleEditClass(cls);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditClass(cls);
                }
              }}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.select();
                }, 0);
              }}
              className="group relative flex max-w-[260px] cursor-default items-center gap-x-1 truncate break-words rounded border border-border bg-gray-200 p-px px-1.5 pr-2 text-[11px] text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
          ) : (
            renderClassBadge(cls)
          ),
        )}
      </div>
    </div>
  );
}
