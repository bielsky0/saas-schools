import { useDebouncedCallback } from "@react-hookz/web";
import { LayoutTemplate } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { usePostsManager } from "~/pages/client/components/posts-manager/use-posts-manager";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { useTemplateData } from "~/pages/hooks/pages/use-template-data";
import { useUpdateTemplate } from "~/pages/hooks/pages/use-update-template";
import { TemplateDataMapping, TemplateElements, TemplateSeoDefaults } from "~/types/collections";

const DEFAULT_DATA_MAPPING: TemplateDataMapping[] = [
  { slot: "heading_h1", field: "title" },
  { slot: "featured_image", field: "image" },
  { slot: "body", field: "body" },
  { slot: "author_date", field: "author+date" },
];

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
  const { open: openPostsModal } = usePostsManager();

  const templateId = context.type === "template" ? context.templateId : undefined;
  const collectionId = context.type === "template" ? context.collectionId : undefined;

  const { data: templateData } = useTemplateData(templateId, collectionId);
  const { mutateAsync: updateTemplate } = useUpdateTemplate();

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
  const dataMapping = config?.dataMapping?.length ? config.dataMapping : DEFAULT_DATA_MAPPING;

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

          {/* Data mapping (read-only in F4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium">{t("Data mapping")}</Label>
              <Badge variant="outline" className="text-[10px]">
                {t("Coming soon")}
              </Badge>
            </div>
            <div className="space-y-1 rounded-md border border-dashed border-gray-200 bg-gray-50 p-2">
              {dataMapping.map((mapping) => (
                <div
                  key={mapping.slot}
                  className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-xs">
                  <span className="truncate font-medium text-slate-700">{mapping.slot}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">→ {mapping.field}</span>
                </div>
              ))}
            </div>
          </div>

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
        <Button variant="outline" size="sm" className="w-full" onClick={() => collectionId && openPostsModal(collectionId)}>
          {t("View posts in this template")}
        </Button>
      </div>
    </div>
  );
};

export default TemplateSettings;
