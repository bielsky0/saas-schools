"use client";

import { defaultChaiLibrary } from "@chaibuilder/sdk";
import { registerChaiLibrary, registerChaiBlockSettingWidget } from "@chaibuilder/sdk/runtime/client";
import "@chaibuilder/sdk/styles";
import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import dynamic from "next/dynamic";
import "@/blocks";
import { langlionLibrary } from "@/lib/blocks-library";
import { GroupTypePickerWidget } from "@/blocks/widgets/group-type-picker";
import { TrainerPickerWidget } from "@/blocks/widgets/trainer-picker";
import { useCallback } from "react";

const ChaiWebsiteBuilder = dynamic(
  () => import("@chaibuilder/sdk/pages").then((mod) => mod.ChaiWebsiteBuilder),
  { ssr: false },
);

loadWebBlocks();
registerChaiLibrary("chai-library", defaultChaiLibrary());
registerChaiLibrary("langlion", langlionLibrary);
registerChaiBlockSettingWidget("groupTypePicker", GroupTypePickerWidget);
registerChaiBlockSettingWidget("trainerPicker", TrainerPickerWidget);

const MOCK_ACCESS_TOKEN = "mock-token-for-visual-test";

export default function Editor() {
  const getAccessToken = useCallback(async () => MOCK_ACCESS_TOKEN, []);
  const getPreviewUrl = useCallback((slug: string) => `/api/preview?slug=${slug}`, []);
  const getLiveUrl = useCallback((slug: string) => `/api/preview?disable=true&slug=${slug}`, []);

  return (
    <ChaiWebsiteBuilder
      flags={{
        dragAndDrop: true,
        designTokens: true,
        ai: true,
      }}
      currentUser={null}
      autoSave
      autoSaveActionsCount={5}
      getAccessToken={getAccessToken}
      apiUrl="/editor/api"
      getPreviewUrl={getPreviewUrl}
      getLiveUrl={getLiveUrl}
    />
  );
}
