import { ChevronDown, File, Hash, LayoutTemplate, Loader, Plus, Search } from "lucide-react";
import { filter, find, get, isEmpty, startCase } from "lodash-es";
import { Suspense, lazy, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/core/functions/common-functions";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useCurrentActivePage } from "~/pages/hooks/pages/use-current-page";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useChangePage } from "~/pages/hooks/use-change-page";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { useCollectionActions } from "~/pages/hooks/pages/use-collection-actions";
import { ChaiPageType } from "~/types/actions";
import { CmsCollectionVm, CmsTemplateVm } from "~/types/collections";

const AddNewPage = lazy(() => import("./add-new-page"));

const pageTypeLabel = (pageType: ChaiPageType, fallback: string) => {
  const name = pageType?.name;
  if (typeof name === "string") return name;
  return startCase(fallback);
};

/**
 * Template creation modal (Shopify-like): a template is a layout designed once
 * in the editor and reused by many posts. Posts themselves are authored in the
 * dashboard, never in the builder — the editor only edits templates.
 */
const AddTemplateModal = ({
  open,
  onClose,
  collections,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  collections: CmsCollectionVm[];
  onCreated: (templateId: string, collectionId: string) => void;
}) => {
  const { t } = useTranslation();
  const { addTemplate } = useCollectionActions();
  const templateCounter = useRef(1);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");

  // For now only the blog collection offers templates (per product decision).
  const templateCollections = collections.filter((c) => c.id === "blog");
  const effectiveCollectionId = templateCollections.some((c) => c.id === collectionId)
    ? collectionId
    : templateCollections[0]?.id ?? "";

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed || !effectiveCollectionId) return;
    const template = {
      id: `tpl-${effectiveCollectionId}-${templateCounter.current++}`,
      name: trimmed,
      layout: "single" as const,
    };
    addTemplate.mutate(
      { collectionId: effectiveCollectionId, template },
      {
        onSuccess: (updatedCollection) => {
          const created = (updatedCollection?.templates ?? []).find(
            (t: CmsTemplateVm) => t.id === template.id,
          );
          setName("");
          onClose();
          if (created) onCreated(created.id, effectiveCollectionId);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("Add template")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name" className="text-xs font-medium">
              {t("Name")}
            </Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Template name")}
              autoFocus
            />
          </div>
          {templateCollections.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="tpl-collection" className="text-xs font-medium">
                {t("Collection")}
              </Label>
              <select
                id="tpl-collection"
                value={effectiveCollectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {templateCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button disabled={!name.trim() || addTemplate.isPending} onClick={handleSubmit}>
            {addTemplate.isPending ? t("Adding") : t("Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PageSelector = () => {
  const { t } = useTranslation();
  const { data: pages, isFetching } = useWebsitePrimaryPages();
  const { data: pageTypes } = usePageTypes();
  const { data: currentPage } = useCurrentActivePage();
  const { data: collections = [] } = useCollections();
  const changePage = useChangePage();
  const [, setIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { setContext: setEditorContext } = useEditorContext();
  const { createCollection } = useCollectionActions();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addEditPage, setAddEditPage] = useState<any>(null);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);

  const filteredPages = useMemo(() => {
    if (!pages) return [];
    const query = search.trim().toLowerCase();
    return filter(pages, (page) => {
      if (query && !(page.name || "").toLowerCase().includes(query) && !(page.slug || "").toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [pages, search]);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const page of filteredPages) {
      const key = page.pageType || "page";
      const label = pageTypeLabel(find(pageTypes, { key }), key);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(page);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPages, pageTypes]);

  // Templates are edited in the builder; posts are authored in the dashboard.
  const templateCollections = useMemo(() => collections.filter((c) => c.id === "blog"), [collections]);

  // Fallback: create blog collection if none exists
  const handleCreateBlogCollection = useCallback(() => {
    createCollection.mutate({
      key: "blog",
      name: "Blog",
      pageType: "blog_post",
      templatePageType: "blog_post_template",
    });
  }, [createCollection]);

  const onPageSelect = useCallback(
    (pageId: string) => {
      setIds([]);
      setStyleBlocks([]);
      changePage(pageId);
      setEditorContext({ type: "page", pageId });
      setOpen(false);
    },
    [setIds, setStyleBlocks, changePage, setEditorContext],
  );

  // Enter template editing mode (context.type === "template") so the
  // TemplateSettings panel with the post-preview dropdown becomes available.
  const onOpenTemplate = useCallback(
    (templateId: string, collectionId: string) => {
      setIds([]);
      setStyleBlocks([]);
      setEditorContext({ type: "template", templateId, collectionId });
      setOpen(false);
    },
    [setIds, setStyleBlocks, setEditorContext],
  );

  const isPartial = !currentPage?.slug;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Select page")}
            className="flex h-7 min-w-0 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100">
            {isFetching ? (
              <Loader className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <span className="flex min-w-0 items-center gap-1">
                {isPartial ? <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <File className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                <span className="max-w-[160px] truncate">{get(currentPage, "name") ?? t("Select page")}</span>
              </span>
            )}
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-72 p-0" sideOffset={6}>
          <div className="flex items-center gap-1 border-b border-gray-200 p-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search pages")}
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md"
              aria-label={t("Add new page")}
              onClick={() => {
                setOpen(false);
                setAddEditPage({});
              }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="no-scrollbar max-h-80 overflow-y-auto p-1">
            {isEmpty(groups) ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("No pages found")}</p>
            ) : (
              groups.map(([label, groupPages]) => (
                <div key={label} className="mb-1">
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  {groupPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onPageSelect(page.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100",
                        currentPage?.id === page.id && "bg-gray-100 font-medium",
                      )}>
                      {page.slug ? <File className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                      <span className="min-w-0 flex-1 truncate">{page.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}

{templateCollections.length > 0 ? (
                <>
                  <div className="mt-1 border-t border-gray-100" />
                  <div className="flex items-center justify-between px-2 pb-1 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("Templates")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-md"
                      aria-label={t("Add template")}
                      title={t("Add template")}
                      onClick={() => setAddTemplateOpen(true)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {templateCollections.map((collection) =>
                    collection.templates.map((template) => (
                      <button
                        key={`${collection.id}:${template.id}`}
                        type="button"
                        onClick={() => onOpenTemplate(template.id, collection.id)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100">
                        <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate">{template.name}</span>
                        <span className="truncate font-mono text-[10px] text-muted-foreground">{collection.name}</span>
                      </button>
                    )),
                  )}
                </>
              ) : (
                // Fallback: no blog collection exists yet
                <div className="mt-1 border-t border-gray-100 px-2 py-2 text-center text-xs text-muted-foreground">
                  <p className="mb-2">{t("No blog collection found.")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleCreateBlogCollection}
                    disabled={createCollection.isPending}>
                    {createCollection.isPending ? t("Creating...") : t("Create blog")}
                  </Button>
                </div>
              )}
          </div>
        </PopoverContent>
      </Popover>

      {addEditPage && (
        <Suspense>
          <AddNewPage
            closePanel={() => setAddEditPage(null)}
            editPage={() => {}}
            addEditPage={addEditPage}
            setAddEditPage={setAddEditPage}
          />
        </Suspense>
      )}

      <AddTemplateModal
        open={addTemplateOpen}
        onClose={() => setAddTemplateOpen(false)}
        collections={collections}
        onCreated={onOpenTemplate}
      />
    </>
  );
};

export default PageSelector;