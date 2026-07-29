import { useAtom } from "jotai";
import { each, noop, omit } from "lodash-es";
import React, { useEffect, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "sonner";
import { chaiBuilderPropsAtom, chaiDesignTokensAtom, chaiPageExternalDataAtom } from "~/atoms/builder";
import { builderStore } from "~/atoms/store";
import { selectedLibraryAtom } from "~/atoms/ui";
import { CssThemeVariables } from "~/core/components/css-theme-var";
import { FallbackError } from "~/core/components/fallback-error";
import { RootLayout } from "~/core/components/layout/root-layout";
import { PreviewScreen } from "~/core/components/PreviewScreen";
import { useAutoSave } from "~/core/components/use-auto-save";
import { setDebugLogs } from "~/core/functions/logging";
import "~/core/index.css";
import i18n from "~/core/locales/load";
import { ExportCodeModal } from "~/core/modals/export-code-modal";
import { ScreenTooSmall } from "~/core/screen-too-small";
import { defaultThemeValues } from "~/hooks/default-theme-options";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBroadcastChannel, useUnmountBroadcastChannel } from "~/hooks/use-broadcast-channel";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useBuilderReset } from "~/hooks/use-builder-reset";
import { useCheckStructure } from "~/hooks/use-check-structure";
import { useExpandTree } from "~/hooks/use-expand-tree";
import { isPageLoadedAtom } from "~/hooks/use-is-page-loaded";
import { useKeyEventWatcher } from "~/hooks/use-key-event-watcher";
import { useWatchPartialBlocks } from "~/hooks/use-partial-blocks-store";
import { builderSaveStateAtom } from "~/hooks/use-save-page";
import { syncBlocksWithDefaultProps } from "~/runtime";
import { ChaiBuilderEditorProps, ChaiTheme } from "~/types";

const ChaiWatchers = (props: ChaiBuilderEditorProps) => {
  const [, setAllBlocks] = useBlocksStore();
  const reset = useBuilderReset();
  const [saveState] = useAtom(builderSaveStateAtom);
  useAtom(selectedLibraryAtom);
  useKeyEventWatcher();
  useExpandTree();
  useAutoSave();
  useWatchPartialBlocks();
  useUnmountBroadcastChannel();
  const { postMessage } = useBroadcastChannel();
  const [, setIsPageLoaded] = useAtom(isPageLoadedAtom);
  const runValidation = useCheckStructure();

  useEffect(() => {
    builderStore.set(
      // @ts-ignore
      chaiBuilderPropsAtom,
      omit(props, ["blocks", "translations", "pageExternalData", "globalStyles"]),
    );
  }, [props]);

  useEffect(() => {
    builderStore.set(chaiPageExternalDataAtom, props.pageExternalData || {});
  }, [props.pageExternalData]);

  useEffect(() => {
    builderStore.set(chaiDesignTokensAtom, props.designTokens || {});
  }, [props.designTokens]);

  useEffect(() => {
    setIsPageLoaded(false);
    // Added delay to allow the pageId to be set
    setTimeout(() => {
      const withDefaults = syncBlocksWithDefaultProps(props.blocks || []);
      // @ts-ignore
      setAllBlocks(withDefaults);
      if (withDefaults && withDefaults.length > 0) {
        postMessage({ type: "blocks-updated", blocks: withDefaults });
      }
      reset();
      setIsPageLoaded(true);
      runValidation(withDefaults);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.blocks]);

  useEffect(() => {
    i18n.changeLanguage(props.locale || "en");
  }, [props.locale]);

  useEffect(() => {
    setDebugLogs(props.debugLogs ?? false);
  }, [props.debugLogs]);

  useEffect(() => {
    if (!props.translations) return;
    each(props.translations, (translations: any, lng: string) => {
      i18n.addResourceBundle(lng, "translation", translations, true, true);
    });
  }, [props.translations]);

  useEffect(() => {
    if (saveState !== "SAVED") {
      window.onbeforeunload = () => "";
    } else {
      window.onbeforeunload = null;
    }

    return () => {
      window.onbeforeunload = null;
    };
  }, [saveState]);
  return null;
};

const ChaiBuilderComponent = (props: ChaiBuilderEditorProps) => {
  const RootLayoutComponent = useMemo(() => props.layout || RootLayout, [props.layout]);
  const builderTheme = useBuilderProp("builderTheme", defaultThemeValues);
  const exportCodeEnabled = useBuilderProp("flags.exportCode", false);
  return (
    <>
      {props.children}
      <CssThemeVariables theme={builderTheme as ChaiTheme} />
      <RootLayoutComponent />
      {exportCodeEnabled && <ExportCodeModal />}
    </>
  );
};
/**
 * ChaiBuilder is the main entry point for the Chai Builder Studio.
 */
const ChaiBuilderEditor: React.FC<ChaiBuilderEditorProps> = (props: ChaiBuilderEditorProps) => {
  const onErrorFn = props.onError || noop;
  return (
    <div className="h-screen w-screen">
      <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
        <ScreenTooSmall />
        <ChaiBuilderComponent {...props} />
        <ChaiWatchers {...props} />
        <PreviewScreen />
        <Toaster richColors />
      </ErrorBoundary>
    </div>
  );
};

export { ChaiBuilderEditor };
