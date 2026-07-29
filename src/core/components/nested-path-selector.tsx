import { ChevronLeftIcon, ChevronRightIcon, IdCardIcon, LoopIcon } from "@radix-ui/react-icons";
import { t } from "i18next";
import { startsWith } from "lodash-es";
import React from "react";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { COLLECTION_PREFIX, REPEATER_PREFIX } from "~/core/constants/STRINGS";
import { useBuilderProp } from "~/hooks/use-builder-prop";

type NestedPathSelectorProps = {
  data: Record<string, any>;
  onSelect: (path: string, type: "value" | "array" | "object") => void;
  dataType?: "value" | "array" | "object";
  repeaterData?: Record<string, any>;
};

type Option = {
  key: string;
  value: any;
  type: "value" | "array" | "object";
};

const PathDropdown = ({ data, onSelect, dataType }: NestedPathSelectorProps) => {
  const [currentPath, setCurrentPath] = React.useState<string[]>([]);
  const [currentData, setCurrentData] = React.useState<Record<string, any>>(data);

  const getValueType = (value: any): "value" | "array" | "object" => {
    if (Array.isArray(value)) return "array";
    if (typeof value === "object" && value !== null) return "object";
    return "value";
  };

  const handleSelect = React.useCallback(
    (option: Option) => {
      const isValueSelectable = (type: "value" | "array" | "object"): boolean => {
        if (dataType === "value") return type === "value" || type === "object";
        if (dataType === "array") return type === "array";
        return type === dataType;
      };

      if (option.type === "object") {
        setCurrentPath((prev) => [...prev, option.key]);
        setCurrentData(option.value);
      } else if (isValueSelectable(option.type)) {
        onSelect([...currentPath, option.key].join("."), dataType!);
      }
    },
    [currentPath, onSelect, dataType],
  );

  const handleBack = React.useCallback(() => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      setCurrentData(newPath.reduce((acc, key) => acc[key], data));
    }
  }, [currentPath, data]);

  const options: Option[] = React.useMemo(() => {
    if (!currentData) return [];
    return Object.entries(currentData)
      .map(([key, value]) => ({ key, value, type: getValueType(value) }))
      .filter((option) => {
        if (!startsWith(option.key, REPEATER_PREFIX) && option.key.includes("/")) return false;
        if (dataType === "value") return option.type === "value" || option.type === "object";
        if (dataType === "array") return option.type === "array" || option.type === "object";
        if (dataType === "object") return option.type === "object";
        return true;
      });
  }, [currentData, dataType]);

  return (
    <Command className="fields-command">
      <CommandInput className="border-none" placeholder="Search..." />
      <CommandList>
        <CommandEmpty>{t("No option found.")}</CommandEmpty>
        <CommandGroup>
          {currentPath.length > 0 && (
            <CommandItem onSelect={handleBack} className="flex items-center text-sm">
              <ChevronLeftIcon className="mr-2 h-4 w-4" />
              {t("Back")}
            </CommandItem>
          )}
          {options.map((option) => (
            <CommandItem
              value={option.key}
              key={option.key}
              disabled={false}
              onSelect={() => handleSelect(option)}
              className="flex items-center justify-between">
              <span className="flex items-center gap-x-2">
                {startsWith(option.key, REPEATER_PREFIX) ? (
                  <LoopIcon />
                ) : startsWith(option.key, COLLECTION_PREFIX) ? (
                  <IdCardIcon />
                ) : null}
                {startsWith(option.key, REPEATER_PREFIX)
                  ? t("Repeater Data")
                  : startsWith(option.key, COLLECTION_PREFIX)
                    ? option.key.replace(COLLECTION_PREFIX, "")
                    : option.key}
              </span>
              <div className="flex items-center gap-2">
                {dataType === "object" && option.type === "object" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 hover:bg-primary hover:text-primary-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect([...currentPath, option.key].join("."), dataType);
                    }}>
                    {t("Select")}
                  </Button>
                )}
                {option.type === "object" && (
                  <div className="cursor-pointer rounded p-1 hover:bg-muted">
                    <ChevronRightIcon className="h-4 w-4 opacity-50" />
                  </div>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export function NestedPathSelector({ data, onSelect, dataType = "value" }: NestedPathSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const collections = useBuilderProp("collections", []) as { id: string }[];

  const pageData = React.useMemo(() => {
    if (dataType === "array") {
      const collectionsKeys = collections.map((c) => c.id);
      return { ...collectionsKeys.reduce((acc, key) => ({ ...acc, [COLLECTION_PREFIX + key]: [] }), {}), ...data };
    }
    return data;
  }, [data, collections, dataType]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 rounded-sm px-1 py-0 text-[9px] text-muted-foreground"
              role="combobox"
              aria-expanded={open}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.5 5H9C7.89543 5 7 5.89543 7 7V9C7 10 6.4 12 4 12C5 12 7 12.6 7 15V17.0002C7 18.1048 7.89543 19 9 19H9.5M14.5 5H15C16.1046 5 17 5.89543 17 7V9C17 10 17.6 12 20 12C19 12 17 12.6 17 15V17.0002C17 18.1048 16.1046 19 15 19H14.5"
                  stroke="#000000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("Add field")}</TooltipContent>
      </Tooltip>

      <PopoverContent className="z-[1000]! relative mr-3 w-[300px] p-0">
        <PathDropdown
          data={pageData}
          onSelect={(path, type) => {
            onSelect(path, type);
            setOpen(false);
          }}
          dataType={dataType}
        />
      </PopoverContent>
    </Popover>
  );
}
