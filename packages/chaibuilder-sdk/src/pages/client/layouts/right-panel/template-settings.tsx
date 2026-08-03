import { useDebouncedCallback } from "@react-hookz/web";
import { LayoutTemplate } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { useBlogPostPreview } from "~/hooks/use-blog-preview";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useBlogPostPreviewData } from "~/pages/hooks/pages/use-blog-post-preview-data";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { useCollectionItems } from "~/pages/hooks/pages/use-collection-items";
import { useTemplateData } from "~/pages/hooks/pages/use-template-data";
import { useUpdateTemplate } from "~/pages/hooks/pages/use-update-template";
import { TemplateElements, TemplateSeoDefaults } from "~/types/collections";

/** Radix Select requires non-empty item values — sentinel for "no post" (F5.3). */
const NONE_POST_VALUE = "__none__";

/**
 * Right panel for editing a collection layout template (blog-templates-cms F4).
 * Layout (single/sidebar), togglable elements, read-only data mapping and SEO
 * defaults are persisted via UPDATE_TEMPLATE (debounced). Blocks on the canvas
 * are saved by the same auto-save pipeline as pages — the onSave redirect in
 * `chaibuilder-pages.tsx` routes it to UPDATE_TEMPLATE when in template mode.
 */
export const TemplateSettings = () => {
  const { t } = useTranslation();
  const { context } = useEditorContext();
  const { data: collections = [] } = useCollections();

  const templateId = context.type === "template" ? context.templateId : undefined;
  const collectionId = context.type === "template" ? context.collectionId : undefined;

  const { data: templateData } = useTemplateData(templateId, collectionId);
  const { mutateAsync: updateTemplate } = useUpdateTemplate();

  // ── F5.3: blog post preview (dropdown → blogPostPreviewAtom) ──────────
  const isBlogTemplate = context.type === "template" && collectionId === "blog";
  const { setPreview } = useBlogPostPreview();
  const { data: collectionItems = [] } = useCollectionItems(
    isBlogTemplate ? collectionId : undefined,
  );
  const [selectedPostId, setSelectedPostId] = useState<string>(NONE_POST_VALUE);
  const { data: selectedPostPreview } = useBlogPostPreviewData(
    selectedPostId && selectedPostId !== NONE_POST_VALUE ? selectedPostId : undefined,
  );

  // Push the fetched post into the preview atom; reset to placeholders outside
  // a blog template or when "Brak" is selected.
  useEffect(() => {
    if (!isBlogTemplate || !selectedPostId || selectedPostId === NONE_POST_VALUE) {
      setPreview(null);
      return;
    }
    if (selectedPostPreview !== undefined) {
      setPreview(selectedPostPreview);
    }
  }, [isBlogTemplate, selectedPostId, selectedPostPreview, setPreview]);

  const collection = useMemo(
    () => collections.find((c) => c.id === collectionId) ?? null,
    [collections, collectionId],
  );
  const template = useMemo(
    () => collection?.templates.find((t) => t.id === templateId) ?? null,
    [collection, templateId],
  );

  const config = templateData?.config;
  const postCount = collection?.postCount ?? 0;

  // Debounced config save (matching the 1000ms pattern used across the builder).
  const saveConfig = useDebouncedCallback(
    async (nextConfig: NonNullable<typeof config>) => {
      if (!templateId || !collectionId) return;
      await updateTemplate({ templateId, collectionId, config: nextConfig });
    },
    [updateTemplate, templateId, collectionId],
    1000,
  );

  const patchConfig = useCallback(
    (patch: (prev: NonNullable<typeof config>) => NonNullable<typeof config>) => {
      if (!config) return;
      saveConfig(patch(config));
    },
    [config, saveConfig],
  );

  if (context.type !== "template" || !templateId || !collectionId || !template) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("Select a template to edit its settings")}</p>
      </div>
    );
  }

  const elements: TemplateElements = config?.elements ?? {};
  const seoDefaults: TemplateSeoDefaults = config?.seoDefaults ?? {};

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {t("Template")} · {collection?.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{template.name}</p>
        </div>
        <Badge variant="secondary">{config?.layout}</Badge>
      </div>
      <Separator className="mb-3" />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="space-y-5">
          {/* Post preview (F5.3) — blog template only */}
          {isBlogTemplate && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t("Post preview")}</Label>
              <Select value={selectedPostId} onValueChange={setSelectedPostId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={t("Choose a post to preview")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_POST_VALUE}>{t("None")}</SelectItem>
                  {collectionItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("Blog blocks render the selected post's data")}
              </p>
            </div>
          )}

          {/* Layout */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">{t("Layout")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={config?.layout === "single" ? "default" : "outline"}
                size="sm"
                onClick={() => patchConfig((prev) => ({ ...prev, layout: "single" }))}>
                {t("Single column")}
              </Button>
              <Button
                variant={config?.layout === "sidebar" ? "default" : "outline"}
                size="sm"
                onClick={() => patchConfig((prev) => ({ ...prev, layout: "sidebar" }))}>
                {t("With sidebar")}
              </Button>
            </div>
          </div>

          {/* Elements */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">{t("Elements")}</Label>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">{t("Featured image")}</Label>
                <Switch
                  checked={elements.thumbnail !== false}
                  onCheckedChange={(checked) =>
                    patchConfig((prev) => ({
                      ...prev,
                      elements: { ...prev.elements, thumbnail: checked },
                    }))
                  }
                />
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">{t("Related articles")}</Label>
                <Switch
                  checked={elements.related !== false}
                  onCheckedChange={(checked) =>
                    patchConfig((prev) => ({
                      ...prev,
                      elements: { ...prev.elements, related: checked },
                    }))
                  }
                />
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">{t("Newsletter signup")}</Label>
                <Switch
                  checked={elements.newsletter === true}
                  onCheckedChange={(checked) =>
                    patchConfig((prev) => ({
                      ...prev,
                      elements: { ...prev.elements, newsletter: checked },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* SEO defaults */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">{t("SEO defaults")}</Label>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="seo-title-pattern">
                {t("Title pattern")}
              </Label>
              <Input
                id="seo-title-pattern"
                value={seoDefaults.titlePattern ?? ""}
                onChange={(e) =>
                  patchConfig((prev) => ({
                    ...prev,
                    seoDefaults: { ...prev.seoDefaults, titlePattern: e.target.value },
                  }))
                }
                className="text-xs"
                placeholder="[Tytuł wpisu] — Blog"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="seo-description-pattern">
                {t("Description pattern")}
              </Label>
              <Input
                id="seo-description-pattern"
                value={seoDefaults.descriptionPattern ?? ""}
                onChange={(e) =>
                  patchConfig((prev) => ({
                    ...prev,
                    seoDefaults: { ...prev.seoDefaults, descriptionPattern: e.target.value },
                  }))
                }
                className="text-xs"
                placeholder="[Zajawka wpisu]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t pt-3">
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          {t("Changes will affect {{count}} posts", { count: postCount })}
        </div>
      </div>
    </div>
  );
};

export default TemplateSettings;
