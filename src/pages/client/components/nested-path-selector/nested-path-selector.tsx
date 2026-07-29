"use client";

import * as React from "react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
const NestedPathSelectorContent = React.lazy(() => import("./nested-path-selector-content"));

type NestedPathSelectorProps = {
  data: Record<string, any>;
  onSelect: (path: string) => void;
  dataType?: "value" | "array" | "object";
  disabled?: boolean;
};

export function NestedPathSelector({ data, onSelect, dataType = "value", disabled = false }: NestedPathSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 px-1 py-0 text-[9px] text-muted-foreground"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.5 5H9C7.89543 5 7 5.89543 7 7V9C7 10 6.4 12 4 12C5 12 7 12.6 7 15V17.0002C7 18.1048 7.89543 19 9 19H9.5M14.5 5H15C16.1046 5 17 5.89543 17 7V9C17 10 17.6 12 20 12C19 12 17 12.6 17 15V17.0002C17 18.1048 16.1046 19 15 19H14.5"
                  stroke="#000000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"></path>
              </svg>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Add field</TooltipContent>
      </Tooltip>
      {open && (
        <React.Suspense>
          <NestedPathSelectorContent
            data={data}
            onSelect={onSelect}
            dataType={dataType}
            open={open}
            setOpen={setOpen}
          />
        </React.Suspense>
      )}
    </Popover>
  );
}
