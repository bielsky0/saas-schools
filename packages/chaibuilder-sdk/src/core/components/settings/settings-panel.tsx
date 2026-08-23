import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { noop } from "lodash-es";
import React, { lazy, Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FallbackError } from "~/core/components/fallback-error";
import { AdvancedPanel } from "~/core/components/settings/advanced-panel";
import BlockSettings from "~/core/components/settings/block-settings";
import BlockStyling from "~/core/components/settings/block-styling";
import { PERMISSIONS } from "~/core/main";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useLanguages } from "~/hooks/use-languages";
import { usePermissions } from "~/hooks/use-permissions";
import { useSavePage } from "~/hooks/use-save-page";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useActiveSettingsTab } from "~/hooks/use-theme";
import { ResetStylesButton } from "./choices/reset-all-styles";

const AiPanelContent = lazy(() => import("~/pages/panels/ai-panel/ai-panel-content"));

const PartialWrapper = ({ partialBlockId }: { partialBlockId: string }) => {
  const gotoPage = useBuilderProp("gotoPage", noop);
  const { saveState } = useSavePage();
  const { selectedLang, fallbackLang } = useLanguages();
  const onDoubleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (saveState !== "SAVED") {
        toast.error("You have unsaved changes. Please save the page first.");
        return;
      }
      gotoPage({ pageId: partialBlockId, lang: selectedLang || fallbackLang });
    },
    [saveState, gotoPage, partialBlockId, selectedLang, fallbackLang],
  );
  return (
    <>
      <div className="hidden">
        <div onDoubleClick={onDoubleClick} className="h-full w-full items-center justify-center">
          <p className="rounded-md bg-white px-2 py-1 text-xs">Partial block. Double click to edit.</p>
        </div>
      </div>
    </>
  );
};

const SettingsPanel: React.FC = () => {
  const selectedBlock = useSelectedBlock();
  const { t } = useTranslation();
  const onErrorFn = useBuilderProp("onError", noop);
  const { hasPermission } = usePermissions();
  const devMode = useBuilderProp("flags.devMode", false);
  const aiEnabled = useBuilderProp("flags.ai", false);
  let isSettingsDisabled = !hasPermission(PERMISSIONS.EDIT_BLOCK);
  const isStylesDisabled = !hasPermission(PERMISSIONS.EDIT_STYLES);
  const [activeTab, setActiveTab] = useActiveSettingsTab();
  const safeTab = !aiEnabled && activeTab === "ai" ? "settings" : activeTab;

  const isPartialBlock = selectedBlock && selectedBlock._type === "PartialBlock";

  if (isPartialBlock) {
    return <PartialWrapper partialBlockId={selectedBlock.partialBlockId!} />;
  }

  if (!selectedBlock) {
    return (
      <div className="p-4 text-center">
        <div className="space-y-4 rounded-xl p-4 text-muted-foreground">
          <MixerHorizontalIcon className="mx-auto text-3xl" />
          <h1>{t("Select a block or page")}</h1>
        </div>
      </div>
    );
  }

  if (isSettingsDisabled && isStylesDisabled) {
    return (
      <div className="p-4 text-center">
        <div className="space-y-4 rounded-xl p-4 text-muted-foreground">
          <MixerHorizontalIcon className="mx-auto text-3xl" />
          <h1>{t("You don't have permission to edit settings or styles")}</h1>
          <p>{t("Please contact your administrator to get access")}</p>
        </div>
      </div>
    );
  }

  // Show only settings panel if styles are disabled
  if (isStylesDisabled) {
    return (
      <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
        <div className="no-scrollbar h-full max-h-min w-full overflow-y-auto">
          <BlockSettings key={selectedBlock?._id} />
          <br />
          <br />
        </div>
      </ErrorBoundary>
    );
  }

  // Show only styles panel if settings are disabled
  if (isSettingsDisabled) {
    return (
      <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
        <div className="no-scrollbar h-full max-h-min w-full overflow-y-auto overflow-x-hidden">
          <div className="flex w-full items-center justify-end">
            <ResetStylesButton />
          </div>
          <BlockStyling />
          {devMode && <AdvancedPanel />}
          <br />
          <br />
          <br />
        </div>
      </ErrorBoundary>
    );
  }

  const handleTabChange = (value: string) => {
    if (value === "settings" || value === "styles" || value === "advanced" || value === "ai") {
      setActiveTab(value);
    }
  };

  const tabCount = 2 + (aiEnabled ? 1 : 0) + (devMode ? 1 : 0);

  // Show both tabs if both permissions are enabled
  return (
    <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
      <Tabs value={safeTab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <TabsList
            className="grid h-auto w-full p-1 py-1"
            style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}>
            <TabsTrigger value="settings" className="text-xs">
              {t("Content")}
            </TabsTrigger>
            <TabsTrigger value="styles" className="text-xs">
              <span className="w-full text-center">{t("Styling")}</span>
            </TabsTrigger>
            {aiEnabled && (
              <TabsTrigger value="ai" className="text-xs">
                <span className="w-full text-center">{t("AI")}</span>
              </TabsTrigger>
            )}
            {devMode && (
              <TabsTrigger value="advanced" className="text-xs">
                <div className="flex w-full items-center justify-center gap-1">
                  <span>{t("Advanced")}</span>
                  <span className="rounded border border-dashed border-muted-foreground/40 px-1 text-[9px] font-normal uppercase tracking-wide text-muted-foreground">
                    dev
                  </span>
                </div>
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent value="settings" className="no-scrollbar h-full max-h-min overflow-y-auto">
          <BlockSettings key={selectedBlock?._id} />
          <br />
          <br />
        </TabsContent>
        <TabsContent
          value="styles"
          className="no-scrollbar h-full max-h-min max-w-full overflow-y-auto overflow-x-hidden">
          <div className="mb-2 flex items-center justify-end">
            <ResetStylesButton />
          </div>
          <BlockStyling />
          <br />
          <br />
          <br />
        </TabsContent>
        {aiEnabled && (
          <TabsContent value="ai" className="h-full min-h-0">
            <div className="flex h-[540px] flex-col overflow-hidden rounded-lg border border-border">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-xs">Loading...</div>}>
                <AiPanelContent />
              </Suspense>
            </div>
          </TabsContent>
        )}
        {devMode && (
          <TabsContent
            value="advanced"
            className="no-scrollbar h-full max-h-min max-w-full overflow-y-auto overflow-x-hidden">
            <p className="border-b border-border py-2 text-[11px] text-muted-foreground">
              {t("Advanced (CSS classes)")}
            </p>
            <AdvancedPanel />
            <br />
            <br />
            <br />
          </TabsContent>
        )}
      </Tabs>
    </ErrorBoundary>
  );
};

export default SettingsPanel;
