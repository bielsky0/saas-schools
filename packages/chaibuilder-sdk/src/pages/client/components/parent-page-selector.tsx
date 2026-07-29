"use client";

import { isEmpty } from "lodash-es";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { removeSlugExtension } from "~/pages/utils/slug-utils";
import { useChaiFeatureFlag } from "~/runtime/client";
import ChaiCommandList from "./ui/chai-command-list";

// Utility to conditionally join class names
const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ");

export interface PageData {
  id: string;
  name: string;
  slug: string;
  parent?: string;
}

interface ParentPageSelectorProps {
  pages: PageData[] | undefined;
  selectedParentId: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  currentPage?: Partial<any>;
}

export function ParentPageSelector({
  pages,
  selectedParentId,
  onChange,
  className,
  id = "parentPage",
  currentPage,
}: ParentPageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isSearchAndSelectEnabled = useChaiFeatureFlag("enable-add-page-dropdown");
  if (!isSearchAndSelectEnabled) {
    className = "w-full rounded-md border border-gray-300 px-3 py-2";
  }

  const sortedPages = useMemo(() => {
    if (!pages || pages.length === 0) return [];

    // Filter valid pages
    const validPages = pages.filter((page) => !isEmpty(page.slug)).filter((page) => page.slug !== "/");

    // Sort pages by slug
    return validPages.sort((a, b) => a.slug.localeCompare(b.slug));
  }, [pages]);

  // Filter pages based on search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return sortedPages;

    const query = searchQuery.toLowerCase();
    return sortedPages.filter(
      (page) => page.name.toLowerCase().includes(query) || page.slug.toLowerCase().includes(query),
    );
  }, [sortedPages, searchQuery]);

  // Calculate indentation level based on slug depth
  const getIndentationLevel = (slug: string): number => {
    // Count the number of slashes (/) minus 1 for the leading slash
    return Math.max(0, (slug.match(/\//g) || []).length - 1);
  };

  // Generate indentation string (using spaces)
  const getIndentation = (level: number): string => {
    return "\u00A0\u00A0\u00A0\u00A0".repeat(level);
  };

  // Get the relevant part of the slug (last segment) without extension
  const getDisplaySlug = (slug: string): string => {
    if (slug === "/") return "/";

    // For child pages, extract just the last part of the slug
    const segments = slug.split("/").filter(Boolean);
    if (segments.length <= 1) {
      // Remove extension from the segment
      const segment = segments[0] || "";
      return `/${removeSlugExtension(segment)}`;
    }
    return `/${removeSlugExtension(segments[segments.length - 1])}`;
  };

  // Get display text for the selected page
  const getDisplayText = (): string => {
    if (!selectedParentId || selectedParentId === "none") return "None";
    const selectedPage = sortedPages.find((page) => page.id === selectedParentId);
    return selectedPage ? `${selectedPage.name} (${getDisplaySlug(selectedPage.slug)})` : "None";
  };

  return (
    <div className="space-y-0.5">
      <Label htmlFor={id} className="text-sm">
        Parent
      </Label>
      {isSearchAndSelectEnabled ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              role="combobox"
              className={cn("w-full justify-between", className)}
              data-testid="parent-page-selector">
              {getDisplayText()}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="relative border-none py-2">
                <div className="sticky top-0 z-10 bg-white px-3 py-2">
                  <div className="relative">
                    <Search strokeWidth={2} className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search pages..."
                      className="h-8 pl-8 text-xs"
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <ChaiCommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No pages found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onChange("");
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex cursor-pointer items-center justify-between">
                    <span>None</span>
                    <Check className={cn("mr-2 h-4 w-4", !selectedParentId ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                  {filteredPages.map((page) => {
                    const indent = getIndentation(getIndentationLevel(page.slug));
                    const displaySlug = getDisplaySlug(page.slug);
                    const displayName = (
                      <span className="flex items-center text-sm">
                        {indent}
                        {page.name}
                        <span className="text-xs text-gray-500"> ({displaySlug})</span>
                      </span>
                    );

                    return (
                      <CommandItem
                        key={page.id}
                        value={page.id}
                        onSelect={() => {
                          onChange(page.id);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex cursor-pointer items-center justify-between whitespace-pre-wrap">
                        <span>{displayName}</span>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selectedParentId === page.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </ChaiCommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <select
          id={id}
          value={selectedParentId || "none"}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          data-testid="parent-page-selector">
          <option value="none">None</option>
          {sortedPages.map((page) => {
            const indentLevel = getIndentationLevel(page.slug);
            const indent = indentLevel > 0 ? getIndentation(indentLevel) : "";
            const displaySlug = getDisplaySlug(page.slug);
            const isDisabled =
              currentPage?.id && (currentPage.id === page.id || page.slug.startsWith(currentPage.slug + "/"));

            if (isDisabled) {
              return null;
            }
            return (
              <option key={page.id} value={page.id}>
                {indent}
                {page.name} ({displaySlug})
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
