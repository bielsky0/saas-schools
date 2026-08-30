import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, File, FileText, LayoutTemplate, Loader, Plus, Search, Settings } from "lucide-react";
import { filter, find, get, isEmpty } from "lodash-es";
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
import { useChangePage } from "~/pages/hooks/use-change-page";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { useCollectionActions } from "~/pages/hooks/pages/use-collection-actions";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { isSystemPageType } from "~/pages/client/layouts/left-panel/page-groups";
import { CmsCollectionVm, CmsTemplateVm } from "~/types/collections";
import type { ChaiPageType } from "~/types/actions";

const AddNewPage = lazy(() => import("./add-new-page"));

type PickerItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

type PickerSection = {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: PickerItem[];
  /** Drill-down items (detail view). When present the section is a chevron row. */
  children?: PickerItem[];
  createLabel?: string;
  onCreate?: () => void;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
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

  // Template creation is offered for the collections whose templates are
  // surfaced in this selector: the blog and the enrollment landing pages.
  // Enrollment templates (mvp-plan F2) are created/edited here like blog ones —
  // the enrollments collection stays hidden from the left panel's CMS tree.
  const TEMPLATE_COLLECTION_KEYS = ["blog", "enrollments"] as const;
  const templateCollections = collections.filter((c) =>
    (TEMPLATE_COLLECTION_KEYS as readonly string[]).includes(c.id),
  );
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

const PickerItemRow = ({ item }: { item: PickerItem }) => (
  <button
    type="button"
    disabled={item.disabled}
    onClick={item.onSelect}
    className={cn(
      "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100",
      item.active && "bg-gray-100 font-medium text-gray-900",
      item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
    )}>
    <span className={cn("shrink-0", item.active ? "text-primary" : "text-gray-400")}>{item.icon}</span>
    <span className="min-w-0 flex-1 truncate">{item.label}</span>
    {typeof item.count === "number" && (
      <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        {item.count}
      </span>
    )}
  </button>
);

export const PageSelector = () => {
  const { t } = useTranslation();
  const { data: pages, isFetching } = useWebsitePrimaryPages();
  const { data: currentPage } = useCurrentActivePage();
  const { data: collections = [] } = useCollections();
  const { data: pageTypes = [] } = usePageTypes();
  const changePage = useChangePage();
  const [, setIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { context: editorContext, setContext: setEditorContext } = useEditorContext();
  const { createCollection } = useCollectionActions();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addEditPage, setAddEditPage] = useState<any>(null);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setSearch("");
      setActiveSection(null);
    }
  };

  const onPageSelect = useCallback(
    (pageId: string) => {
      setIds([]);
      setStyleBlocks([]);
      changePage(pageId);
      setEditorContext({ type: "page", pageId });
      setActiveSection(null);
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
      setActiveSection(null);
      setOpen(false);
    },
    [setIds, setStyleBlocks, setEditorContext],
  );

  // Fallback: create blog collection if none exists
  const handleCreateBlogCollection = useCallback(() => {
    createCollection.mutate({
      key: "blog",
      name: "Blog",
      pageType: "blog_post",
      templatePageType: "blog_post_template",
    });
  }, [createCollection]);

  // Fallback: create the enrollments collection if none exists (mvp-plan F2)
  const handleCreateEnrollmentCollection = useCallback(() => {
    createCollection.mutate({
      key: "enrollments",
      name: "Zapis na zajęcia",
      pageType: "enrollment_detail",
      templatePageType: "enrollment_template",
    });
  }, [createCollection]);

  const blogCollection = useMemo(() => find(collections, { id: "blog" }), [collections]);
  const enrollmentCollection = useMemo(
    () => find(collections, { id: "enrollments" }),
    [collections],
  );

  /**
   * Only regular pages are editable page-by-page in the builder. Collection
   * entries (`blog_post`, …) are authored in the dashboard, so they stay out of
   * the picker. The blog listing page gets its own "Blogi" section, and the
   * post templates are exposed via the "Posty na blogu" drill-down.
   */
  const listingPages = useMemo(() => {
    if (!pages) return [];
    return filter(pages, (p) => p.pageType === "page" || !p.pageType);
  }, [pages]);

  const systemPages = useMemo(() => {
    if (!pages || isEmpty(pageTypes)) return [];
    const systemKeys = new Set((pageTypes as ChaiPageType[]).filter(isSystemPageType).map((type) => type.key));
    return filter(pages, (p) => systemKeys.has(p.pageType));
  }, [pages, pageTypes]);

  const blogIndexPage = useMemo(
    () => find(pages, (p) => p.pageType === "blog_index") ?? null,
    [pages],
  );

  const sections = useMemo<PickerSection[]>(() => {
    const result: PickerSection[] = [];

    if (!isEmpty(listingPages)) {
      result.push({
        id: "pages",
        label: t("Pages"),
        icon: <FileText className="h-4 w-4" />,
        items: listingPages.map((page) => ({
          id: page.id,
          label: page.name,
          icon: <File className="h-3.5 w-3.5" />,
          active: editorContext.type === "page" && currentPage?.id === page.id,
          onSelect: () => onPageSelect(page.id),
        })),
      });
    }

    if (!isEmpty(systemPages)) {
      result.push({
        id: "system-pages",
        label: t("System pages"),
        icon: <Settings className="h-4 w-4" />,
        items: systemPages.map((page) => ({
          id: page.id,
          label: page.name,
          icon: <Settings className="h-3.5 w-3.5" />,
          active: editorContext.type === "page" && currentPage?.id === page.id,
          onSelect: () => onPageSelect(page.id),
        })),
      });
    }

    if (blogIndexPage) {
      result.push({
        id: "blogs",
        label: t("Blogs"),
        icon: <BookOpen className="h-4 w-4" />,
        items: [
          {
            id: blogIndexPage.id,
            label: t("Blogs"),
            icon: <BookOpen className="h-3.5 w-3.5" />,
            count: blogCollection?.postCount,
            active: editorContext.type === "page" && currentPage?.id === blogIndexPage.id,
            onSelect: () => onPageSelect(blogIndexPage.id),
          },
        ],
      });
    }

    // Shared template drill-down builder: a chevron section listing a
    // collection's layout templates with a "+ Create template" action.
    const templateSection = (
      id: string,
      label: string,
      collection: CmsCollectionVm | undefined,
      emptyMessage?: string,
      emptyActionLabel?: string,
      onEmptyAction?: () => void,
    ): PickerSection => ({
      id,
      label,
      icon: <LayoutTemplate className="h-4 w-4" />,
      items: [],
      children: (collection?.templates ?? []).map((template) => ({
        id: template.id,
        label: template.name,
        icon: <LayoutTemplate className="h-3.5 w-3.5" />,
        active:
          editorContext.type === "template" && editorContext.templateId === template.id,
        onSelect: () => collection && onOpenTemplate(template.id, collection.id),
      })),
      createLabel: t("Create template"),
      onCreate: () => {
        setOpen(false);
        setAddTemplateOpen(true);
      },
      emptyMessage,
      emptyActionLabel,
      onEmptyAction,
    });

    result.push(
      templateSection(
        "blog-posts",
        t("Blog posts"),
        blogCollection,
        blogCollection ? undefined : t("No blog collection found."),
        blogCollection ? undefined : t("Create blog"),
        blogCollection ? undefined : handleCreateBlogCollection,
      ),
    );

    result.push(
      templateSection(
        "enrollment-templates",
        t("Enrollment templates"),
        enrollmentCollection,
        enrollmentCollection ? undefined : t("No enrollment collection found."),
        enrollmentCollection ? undefined : t("Create enrollment collection"),
        enrollmentCollection ? undefined : handleCreateEnrollmentCollection,
      ),
    );

    return result;
  }, [
    listingPages,
    systemPages,
    blogIndexPage,
    blogCollection,
    enrollmentCollection,
    t,
    editorContext,
    currentPage,
    onPageSelect,
    onOpenTemplate,
    handleCreateBlogCollection,
    handleCreateEnrollmentCollection,
  ]);

  const query = search.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    if (!query) return sections;
    return sections
      .map((section) => {
        if (section.children) {
          return section.label.toLowerCase().includes(query) ? section : null;
        }
        const items = section.items.filter((item) => item.label.toLowerCase().includes(query));
        return items.length ? { ...section, items } : null;
      })
      .filter(Boolean) as PickerSection[];
  }, [sections, query]);

  const activeSectionData = activeSection ? sections.find((s) => s.id === activeSection) ?? null : null;

  const detailItems = useMemo(() => {
    if (!activeSectionData?.children) return [];
    if (!query) return activeSectionData.children;
    return activeSectionData.children.filter((item) => item.label.toLowerCase().includes(query));
  }, [activeSectionData, query]);

  const activeTemplateName = useMemo(() => {
    if (editorContext.type !== "template") return null;
    const c = find(collections, { id: editorContext.collectionId });
    return c?.templates.find((tmpl) => tmpl.id === editorContext.templateId)?.name ?? null;
  }, [collections, editorContext]);

  const isPartial = !currentPage?.slug;

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Select page")}
            className="group flex h-8 min-w-0 max-w-[220px] items-center gap-1 rounded px-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100">
            {isFetching ? (
              <Loader className="h-4 w-4 animate-spin text-slate-400" />
            ) : editorContext.type === "template" ? (
              <span className="flex min-w-0 items-center gap-1">
                <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="max-w-[120px] truncate">{activeTemplateName ?? t("Template")}</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1">
                {isPartial || currentPage?.pageType !== "blog_index" ? (
                  <File className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                )}
                <span className="max-w-[120px] truncate">{get(currentPage, "name") ?? t("Select page")}</span>
              </span>
            )}
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-400 transition-opacity opacity-0 group-hover:opacity-100" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-[320px] p-0" sideOffset={6}>
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

          <div className="relative max-h-[420px]">
            {/* Main view */}
            <div
              className={cn(
                "no-scrollbar max-h-[420px] overflow-y-auto p-1 transition-all duration-150 ease-out",
                activeSection && "pointer-events-none -translate-x-4 opacity-0",
              )}>
              {isEmpty(visibleSections) ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("No pages found")}</p>
              ) : (
                visibleSections.map((section) => (
                  <div key={section.id} className="mb-1">
                    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </div>
                    {section.children ? (
                      <button
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100">
                        <span className="shrink-0 text-gray-400">{section.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{section.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      </button>
                    ) : (
                      section.items.map((item) => <PickerItemRow key={item.id} item={item} />)
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Detail view */}
            <div
              aria-hidden={!activeSection}
              className={cn(
                "absolute inset-0 bg-white transition-all duration-150 ease-out",
                activeSection ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
              )}>
              {activeSectionData && (
                <>
                  <div className="flex items-center gap-1 border-b border-gray-200 p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-md"
                      aria-label={t("Back")}
                      onClick={() => {
                        setSearch("");
                        setActiveSection(null);
                      }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="truncate text-xs font-semibold text-gray-700">{activeSectionData.label}</span>
                  </div>
                  <div className="no-scrollbar max-h-[330px] overflow-y-auto p-1">
                    {activeSectionData.emptyMessage && isEmpty(detailItems) ? (
                      <div className="mt-1 border-t border-gray-100 px-2 py-2 text-center text-xs text-muted-foreground">
                        <p className="mb-2">{activeSectionData.emptyMessage}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={activeSectionData.onEmptyAction}
                          disabled={createCollection.isPending}>
                          {createCollection.isPending ? t("Creating...") : activeSectionData.emptyActionLabel}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {detailItems.map((item) => (
                          <PickerItemRow key={item.id} item={item} />
                        ))}
                        {activeSectionData.createLabel && (
                          <button
                            type="button"
                            onClick={activeSectionData.onCreate}
                            className="mt-1 flex w-full items-center gap-1.5 rounded-md border-t border-gray-100 px-2 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100">
                            <Plus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            {activeSectionData.createLabel}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
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