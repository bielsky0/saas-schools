import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/core/utils/cn";
import { SectionPreview } from "../section-preview";
import { filterPickerCategories, PickerCategory, PickerItem } from "./picker-categories";

type PickerPopoverProps = {
  /** Element that toggles the popover (Shopify-style "Add section" / "Add block"). */
  trigger: ReactNode;
  searchPlaceholder: string;
  /** Accessible name of the dialog. */
  dialogLabel: string;
  categories: PickerCategory[];
  onAdd: (item: PickerItem) => void;
  renderIcon?: (item: PickerItem) => ReactNode;
  renderPreview?: (item: PickerItem) => ReactNode;
};

const Chevron = ({ open }: { open: boolean }) => (
  <span className={cn("inline-flex transition-transform duration-200", !open && "-rotate-90")}>
    <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.24 6.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 0 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06"
      />
    </svg>
  </span>
);

/**
 * Shopify-style two-column picker popover shared by the Section Picker and
 * the Block Picker: a searchable, collapsible category list on the left and a
 * visual preview of the hovered item on the right.
 */
export const PickerPopover = ({
  trigger,
  searchPlaceholder,
  dialogLabel,
  categories,
  onAdd,
  renderIcon,
  renderPreview,
}: PickerPopoverProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<PickerItem | null>(null);

  const firstItem = useMemo(() => categories[0]?.items[0] ?? null, [categories]);
  const activeItem = hovered ?? firstItem;

  const filtered = useMemo(() => filterPickerCategories(categories, query), [categories, query]);

  const toggleCategory = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = (item: PickerItem) => {
    onAdd(item);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setHovered(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        aria-label={dialogLabel}
        side="bottom"
        align="start"
        sideOffset={4}
        className="z-[9999] w-[680px] max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border border-[#EBEBEB] bg-white p-0 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
        <div className="flex min-h-0">
          {/* Left column: search + collapsible category list */}
          <div className="flex w-[400px] flex-col border-r border-[#EBEBEB]">
            <div className="px-4 pb-2 pt-4">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  maxLength={25}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="min-h-0 max-h-[460px] flex-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
                  <p>{query ? t("No results") : t("Nothing to add")}</p>
                </div>
              ) : (
                filtered.map((category) => {
                  const isCollapsed = collapsed.has(category.id);
                  return (
                    <div key={category.id} className="border-b border-[#EBEBEB]">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        aria-expanded={!isCollapsed}
                        aria-controls={`picker-category-${category.id}`}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#F1F1F1]">
                        <h3 className="text-[13px] font-semibold leading-5 text-[#303030]">{t(category.id)}</h3>
                        <span className="text-[#4A4A4A]">
                          <Chevron open={!isCollapsed} />
                        </span>
                      </button>
                      {!isCollapsed && (
                        <ul id={`picker-category-${category.id}`} className="pb-1">
                          {category.items.map((item) => (
                            <li key={item.type}>
                              <button
                                type="button"
                                onClick={() => handleAdd(item)}
                                onMouseEnter={() => setHovered(item)}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-1.5 text-left",
                                  activeItem?.type === item.type ? "bg-[#F1F1F1]" : "hover:bg-[#F1F1F1]",
                                )}>
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#4A4A4A]">
                                  {renderIcon ? renderIcon(item) : null}
                                </span>
                                <span className="truncate text-[13px] font-medium leading-4 text-[#303030]">
                                  {t(item.label)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Right column: visual preview of the active item */}
          <div className="flex w-[280px] shrink-0 flex-col items-center justify-start bg-[#FAFAFA] p-4">
            <p className="mb-3 text-sm font-semibold text-[#303030]">{t("Preview")}</p>
            {activeItem ? (
              renderPreview ? (
                renderPreview(activeItem)
              ) : (
                <SectionPreview type={activeItem.type} />
              )
            ) : (
              <p className="text-sm text-[#616161]">{t("Select an item to preview")}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};