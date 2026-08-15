import { MagnifyingGlassIcon, StackIcon } from "@radix-ui/react-icons";
import { atom, useAtom } from "jotai";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useAddBlock } from "~/hooks/use-add-block";
import { usePubSub } from "~/hooks/use-pub-sub";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import type { SectionCatalogEntry, SectionCategory } from "~/types/section-catalog";
import type { ChaiBlock } from "~/types/common";
import { SECTION_CATEGORY_LABELS, getSectionCatalog } from "./section-catalog";
import { SectionHoverCard } from "./section-preview";

/**
 * Faza 3 (§4.1): biblioteka sekcji w formie wysuwanego panelu (Sheet side="right").
 * Zakładki wg `SectionCategory` + wyszukiwarka filtrująca przez `SectionCatalog.search`
 * + hover-preview (`SectionHoverCard`). Dodanie wstawia sekcję po zaznaczonej sekcji
 * (lub na końcu strony).
 */
export const sectionLibraryOpenAtom = atom(false);
sectionLibraryOpenAtom.debugLabel = "sectionLibraryOpenAtom";

const CATEGORIES: SectionCategory[] = [
  "all",
  "hero",
  "pricing",
  "forms",
  "testimonials",
  "footers",
  "cards",
  "media",
];

/**
 * Filtrowanie wpisów katalogu dla biblioteki sekcji: wyszukiwanie nadpisuje
 * wybraną kategorię. Wyodrębnione jako czysta funkcja dla testów.
 */
export const getLibraryEntries = (
  catalog: { getByCategory(category: SectionCategory): SectionCatalogEntry[]; search(query: string): SectionCatalogEntry[] },
  category: SectionCategory,
  query: string,
): SectionCatalogEntry[] => {
  if (query.trim()) return catalog.search(query);
  return catalog.getByCategory(category);
};

const SectionCard = memo(({ entry, onAdded }: { entry: SectionCatalogEntry; onAdded: () => void }) => {
  const { t } = useTranslation();
  const { addCoreBlock } = useAddBlock();
  const selectedBlock = useSelectedBlock();
  const [allBlocks] = useBlocksStore();

  const handleAdd = () => {
    // Wstaw po najwyższej (top-level) sekcji zawierającej zaznaczony blok; inaczej koniec strony.
    let position = -1;
    if (selectedBlock) {
      const byId = new Map(allBlocks.map((block) => [block._id, block]));
      let top: ChaiBlock | undefined = selectedBlock;
      while (top?._parent) {
        top = byId.get(top._parent);
      }
      const rootBlocks = allBlocks.filter((block) => !block._parent);
      const index = rootBlocks.findIndex((block) => block._id === top?._id);
      if (index > -1) position = index + 1;
    }
    addCoreBlock({ type: entry.type }, undefined, position);
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
    onAdded();
  };

  return (
    <SectionHoverCard type={entry.type}>
      <button
        type="button"
        onClick={handleAdd}
        aria-label={t(entry.labelKey)}
        className="group flex w-full flex-col items-start gap-1 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50">
        <span className="line-clamp-1 w-full text-[13px] font-medium text-foreground">{t(entry.labelKey)}</span>
        {entry.descriptionKey && (
          <span className="line-clamp-2 w-full text-[11px] leading-snug text-muted-foreground">
            {t(entry.descriptionKey)}
          </span>
        )}
      </button>
    </SectionHoverCard>
  );
});
SectionCard.displayName = "SectionCard";

export const SectionLibrarySheet = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(sectionLibraryOpenAtom);
  const [category, setCategory] = useState<SectionCategory>("all");
  const [query, setQuery] = useState("");
  const catalog = useMemo(() => getSectionCatalog(), []);

  usePubSub(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK, () => setOpen(false));

  const handleQueryChange = (next: string) => {
    setQuery(next);
    if (next.trim()) setCategory("all");
  };

  const entries = useMemo(() => getLibraryEntries(catalog, category, query), [catalog, category, query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setCategory("all");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-background/95 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">{t("Add section")}</SheetTitle>
          <SheetDescription>{t("Browse and add a ready-made section to your page")}</SheetDescription>
        </SheetHeader>

        <div className="shrink-0 space-y-2 border-b px-3 py-2">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={t("Search sections")}
              aria-label={t("Search sections")}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <Tabs value={category} onValueChange={(value) => setCategory(value as SectionCategory)}>
            <TabsList className="no-scrollbar flex h-auto w-full flex-wrap justify-start overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="px-2.5 py-1 text-xs">
                  {cat === "all" ? t("All") : t(SECTION_CATEGORY_LABELS[cat])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <StackIcon className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">{t("No sections found")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {entries.map((entry) => (
                  <SectionCard key={entry.type} entry={entry} onAdded={() => setOpen(false)} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
