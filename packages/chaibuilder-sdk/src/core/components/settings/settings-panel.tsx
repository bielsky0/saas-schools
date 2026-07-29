import { ChevronDownIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { isEmpty, noop } from "lodash-es";
import React, { useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FallbackError } from "~/core/components/fallback-error";
import BlockSettings from "~/core/components/settings/block-settings";
import BlockStyling from "~/core/components/settings/block-styling";
import { BlockAttributesEditor } from "~/core/components/settings/new-panel/block-attributes-editor";
import { PERMISSIONS } from "~/core/main";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useLanguages } from "~/hooks/use-languages";
import { usePermissions } from "~/hooks/use-permissions";
import { useSavePage } from "~/hooks/use-save-page";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useActiveSettingsTab } from "~/hooks/use-theme";
import { ResetStylesButton } from "./choices/reset-all-styles";

function BlockAttributesToggle() {
  const { t } = useTranslation();
  const [showAttributes, setShowAttributes] = useState(true);
  const [stylingBlocks] = useSelectedStylingBlocks();
  if (isEmpty(stylingBlocks)) {
    return null;
  }
  return (
    <>
      <div
        onClick={() => setShowAttributes(!showAttributes)}
        className="flex cursor-pointer items-center justify-between border-t border-border py-3 text-xs font-medium hover:underline">
        <span>{t("Attributes")}</span>
        <span>
          <ChevronDownIcon className={"h-4 w-4 text-gray-500 " + (showAttributes ? "rotate-180" : "")} />
        </span>
      </div>
      {showAttributes && <BlockAttributesEditor />}
    </>
  );
}

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
  let isSettingsDisabled = !hasPermission(PERMISSIONS.EDIT_BLOCK);
  const isStylesDisabled = !hasPermission(PERMISSIONS.EDIT_STYLES);
  const [activeTab, setActiveTab] = useActiveSettingsTab();

  const isPartialBlock = selectedBlock && selectedBlock._type === "PartialBlock";

  if (isPartialBlock) {
    return <PartialWrapper partialBlockId={selectedBlock.partialBlockId!} />;
  }

  if (!selectedBlock) {
    return (
      <div className="p-4 text-center">
        <div className="space-y-4 rounded-xl p-4 text-muted-foreground">
          <MixerHorizontalIcon className="mx-auto text-3xl" />
          <h1>{t("Please select a block to edit settings or styles")}</h1>
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
          <BlockAttributesToggle />
          <br />
          <br />
          <br />
        </div>
      </ErrorBoundary>
    );
  }

  const handleTabChange = (value: string) => {
    if (value === "settings" || value === "styles") {
      setActiveTab(value);
    }
  };

  // Show both tabs if both permissions are enabled
  return (
    <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <TabsList className="grid h-auto w-full grid-cols-2 p-1 py-1">
            <TabsTrigger value="settings" className="text-xs">
              {t("Settings")}
            </TabsTrigger>
            <TabsTrigger value="styles" className="text-xs">
              <div className="flex w-full items-center justify-between">
                <span className="w-[90%] text-center">{t("Styling")}</span>
                <span className="w-[10%]">
                  <ResetStylesButton />
                </span>
              </div>
            </TabsTrigger>
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
          <BlockStyling />
          <BlockAttributesToggle />
          <br />
          <br />
          <br />
        </TabsContent>
      </Tabs>
    </ErrorBoundary>
  );
};

export default SettingsPanel;
