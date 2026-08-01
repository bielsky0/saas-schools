import { CopyPlus, Globe, Lock, Trash2 } from "lucide-react";
import { isEmpty } from "lodash-es";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { usePermissions } from "~/hooks/use-permissions";
import { PAGES_PERMISSIONS } from "~/pages/constants/PERMISSIONS";
import { useCurrentActivePage } from "~/pages/hooks/pages/use-current-page";
import { useUpdatePage } from "~/pages/hooks/pages/mutations";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";

const DeletePage = lazy(() => import("~/pages/client/components/delete-page"));
const DuplicatePage = lazy(() => import("~/pages/client/components/duplicate-page"));

const GoogleSearchPreview = ({
  title,
  description,
  slug,
}: {
  title: string;
  description: string;
  slug: string;
}) => (
  <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-3">
    <p className="truncate text-sm font-medium text-[#1a0dab]">{title || "Title"}</p>
    <p className="truncate font-mono text-xs text-[#006621]">www.example.com{slug || "/"}</p>
    <p className="line-clamp-2 text-xs text-gray-600">{description || "Description"}</p>
  </div>
);

interface PageFormSeo {
  title: string;
  description: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
}

interface PageForm {
  name: string;
  slug: string;
  pageType: string;
  seo: PageFormSeo;
}

const emptyForm: PageForm = {
  name: "",
  slug: "",
  pageType: "page",
  seo: { title: "", description: "", canonicalUrl: "", noIndex: false, noFollow: false },
};

export const PageSettings = () => {
  const { t } = useTranslation();
  const { data: page } = useCurrentActivePage();
  const { data: pageTypes } = usePageTypes();
  const { mutate: updatePage, isPending } = useUpdatePage();
  const { hasPermission } = usePermissions();

  const [tab, setTab] = useState("general");
  const [form, setForm] = useState<PageForm>(emptyForm);
  const [prevPageId, setPrevPageId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState(false);

  const editPage = hasPermission(PAGES_PERMISSIONS.EDIT_PAGE);
  const editSeo = hasPermission(PAGES_PERMISSIONS.EDIT_SEO);

  if (page?.id && page.id !== prevPageId) {
    setPrevPageId(page.id);
    setForm({
      name: page.name ?? "",
      slug: (page.slug ?? "").replace(/^\//, ""),
      pageType: page.pageType ?? "page",
      seo: {
        title: page.seo?.title ?? "",
        description: page.seo?.description ?? "",
        canonicalUrl: page.seo?.canonicalUrl ?? "",
        noIndex: Boolean(page.seo?.noIndex),
        noFollow: Boolean(page.seo?.noFollow),
      },
    });
  }

  const dirty = useMemo(() => {
    if (!page?.id) return false;
    return (
      form.name !== (page.name ?? "") ||
      form.slug !== (page.slug ?? "").replace(/^\//, "") ||
      form.pageType !== (page.pageType ?? "page") ||
      form.seo.title !== (page.seo?.title ?? "") ||
      form.seo.description !== (page.seo?.description ?? "") ||
      form.seo.canonicalUrl !== (page.seo?.canonicalUrl ?? "") ||
      form.seo.noIndex !== Boolean(page.seo?.noIndex) ||
      form.seo.noFollow !== Boolean(page.seo?.noFollow)
    );
  }, [form, page]);

  const handleSave = useCallback(() => {
    if (!page?.id || !dirty) return;
    updatePage({
      id: page.id,
      name: form.name,
      slug: form.slug.replace(/^\//, ""),
      pageType: form.pageType,
      seo: { ...page.seo, ...form.seo },
      primaryPage: page.primaryPage ?? undefined,
    });
  }, [page, form, dirty, updatePage]);

  if (!page?.id) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <Globe className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("Select a page to view its settings")}</p>
      </div>
    );
  }

  const isOnline = Boolean(page.online);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{page.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">/{page.slug ?? ""}</p>
        </div>
        <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? t("Live") : t("Draft")}</Badge>
      </div>
      <Separator className="mb-3" />

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="seo">{t("SEO")}</TabsTrigger>
          <TabsTrigger value="access">{t("Access")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2 pt-3">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="page-name">
                {t("Page name")}
              </Label>
              <Input
                id="page-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={!editPage || isPending}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" htmlFor="page-slug">
                {t("URL")}
              </Label>
              <div className="flex items-center gap-1 rounded-md border border-input bg-gray-50 px-2 text-xs text-muted-foreground">
                <span className="shrink-0">/</span>
                <Input
                  id="page-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  disabled={!editPage || isPending}
                  className="h-8 border-none px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" htmlFor="page-type">
                {t("Template")}
              </Label>
              <Select
                value={form.pageType}
                onValueChange={(value) => setForm((f) => ({ ...f, pageType: value }))}
                disabled={!editPage || isPending}>
                <SelectTrigger id="page-type" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pageTypes || []).map((type: any) => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-xs">{t("Visible in menu")}</Label>
                  <p className="text-[10px] leading-4 text-muted-foreground">{t("Coming soon")}</p>
                </div>
                <Switch checked={false} disabled />
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{t("Indexed in Google")}</Label>
                <Switch
                  checked={!form.seo.noIndex}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, seo: { ...f.seo, noIndex: !checked } }))
                  }
                  disabled={!editSeo || isPending}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setDuplicateDialog(true)}>
                <CopyPlus className="mr-1.5 h-3.5 w-3.5" />
                {t("Duplicate")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setDeleteDialog(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("Delete")}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2 pt-3">
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("Search engine preview")}
              </Label>
              <GoogleSearchPreview
                title={form.seo.title}
                description={form.seo.description}
                slug={page.slug ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="seo-title">
                {t("SEO Title")}
              </Label>
              <Input
                id="seo-title"
                value={form.seo.title}
                onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, title: e.target.value } }))}
                disabled={!editSeo || isPending}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="seo-description">
                {t("SEO Description")}
              </Label>
              <Input
                id="seo-description"
                value={form.seo.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seo: { ...f.seo, description: e.target.value } }))
                }
                disabled={!editSeo || isPending}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="seo-canonical">
                {t("Canonical URL")}
              </Label>
              <Input
                id="seo-canonical"
                value={form.seo.canonicalUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seo: { ...f.seo, canonicalUrl: e.target.value } }))
                }
                disabled={!editSeo || isPending}
                className="text-xs"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="access" className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2 pt-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-xs">{t("Publication status")}</Label>
                <p className="text-[10px] leading-4 text-muted-foreground">
                  {isOnline ? t("This page is live on your website") : t("This page is a draft")}
                </p>
              </div>
              <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? t("Live") : t("Draft")}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2 opacity-60">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs">{t("Password protected")}</Label>
                  <p className="text-[10px] leading-4 text-muted-foreground">{t("Coming soon")}</p>
                </div>
              </div>
              <Switch checked={false} disabled />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t pt-3">
        <Button variant="outline" size="sm" disabled={!dirty || isPending} onClick={() => setTab("general")}>
          {t("Cancel")}
        </Button>
        <Button size="sm" disabled={!dirty || isPending} onClick={handleSave}>
          {isPending ? t("Saving...") : t("Save")}
        </Button>
      </div>

      {deleteDialog && (
        <Suspense>
          <DeletePage page={page} onClose={() => setDeleteDialog(false)} />
        </Suspense>
      )}
      {duplicateDialog && !isEmpty(page) && (
        <Suspense>
          <DuplicatePage page={page} onClose={() => setDuplicateDialog(false)} closePanel={() => {}} />
        </Suspense>
      )}
    </div>
  );
};
