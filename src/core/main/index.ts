import ChaiBuilderCanvas from "~/core/components/canvas/canvas-area";
import BlockPropsEditor from "~/core/components/settings/block-settings";
import BlockStyleEditor from "~/core/components/settings/block-styling";
import AddBlocksPanel from "~/core/components/sidepanels/panels/add-blocks/add-blocks";
import ImportHTML from "~/core/components/sidepanels/panels/add-blocks/import-html";
import UILibrariesPanel from "~/core/components/sidepanels/panels/add-blocks/libraries-panel";
import Outline from "~/core/components/sidepanels/panels/outline/list-tree";
import ThemeConfigPanel from "~/core/components/sidepanels/panels/theme-configuration/theme-config-panel";
import i18n from "~/core/locales/load";
import { registerFeatureFlags } from "~/core/utils/feature-flag";
import type { ChaiBuilderEditorProps } from "~/types";

if (typeof window === "undefined") {
  throw new Error("@chaibuilder/sdk is only supported in the browser. Avoid using it in the server side.");
}

// Register feature flags
registerFeatureFlags();

// components
export { AIUserPrompt as ChaiAskAiUserPrompt } from "~/core/components/ask-ai-panel";
export { Breakpoints as ChaiScreenSizes } from "~/core/components/canvas/topbar/canvas-breakpoints";
export { DarkMode as ChaiDarkModeSwitcher } from "~/core/components/canvas/topbar/dark-mode";
export { UndoRedo as ChaiUndoRedo } from "~/core/components/canvas/topbar/undo-redo";
export { ChaiBuilderEditor } from "~/core/components/chaibuilder-editor";
export { AddBlocksDialog as ChaiAddBlocksDialog } from "~/core/components/layout/add-blocks-dialog";
export { BlockAttributesEditor as ChaiBlockAttributesEditor } from "~/core/components/settings/new-panel/block-attributes-editor";
export { DefaultChaiBlocks as ChaiDefaultBlocks } from "~/core/components/sidepanels/panels/add-blocks/default-blocks";
export { ChaiDraggableBlock } from "~/core/components/sidepanels/panels/add-blocks/draggable-block";
export { ExportCodeModal as ChaiExportCodeModal } from "~/core/modals/export-code-modal";
export {
  AddBlocksPanel as ChaiAddBlocksPanel,
  BlockPropsEditor as ChaiBlockPropsEditor,
  BlockStyleEditor as ChaiBlockStyleEditor,
  ChaiBuilderCanvas,
  ImportHTML as ChaiImportHTML,
  Outline as ChaiOutline,
  ThemeConfigPanel as ChaiThemeConfigPanel,
  UILibrariesPanel as ChaiUILibrariesPanel,
};

// i18n
export { i18n };

// helper functions
export { generateUUID as generateBlockId, cn as mergeClasses } from "~/core/functions/common-functions";
export { getClassValueAndUnit } from "~/core/functions/helper-fn";
export { getBlocksFromHTML as convertHTMLToChaiBlocks, getBlocksFromHTML } from "~/core/import-html/html-to-json";
export { defaultChaiLibrary } from "~/core/library-blocks/default-chai-library";

// types
export type { ChaiBuilderEditorProps };

export type { ChaiLibrary, ChaiLibraryBlock } from "~/types/chaibuilder-editor-props";

// constants
export { useTranslation } from "react-i18next";
export { PERMISSIONS } from "~/core/constants/PERMISSIONS";
export { useAddBlock } from "~/hooks/use-add-block";
export { useBlocksHtmlForAi } from "~/hooks/use-blocks-html-for-ai";
export { useHtmlToBlocks } from "~/hooks/use-html-to-blocks";
export { useI18nBlocks } from "~/hooks/use-i18n-blocks";
export { useLanguages } from "~/hooks/use-languages";
export { useReplaceBlock } from "~/hooks/use-replace-block";
export { useSavePage } from "~/hooks/use-save-page";
export { useSelectedBlock } from "~/hooks/use-selected-blockIds";
export { useStreamMultipleBlocksProps } from "~/hooks/use-update-blocks-props";
export * from "~/runtime/client";
export type { ChaiTheme } from "~/types/chaibuilder-editor-props";
