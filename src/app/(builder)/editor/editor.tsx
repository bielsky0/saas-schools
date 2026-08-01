"use client";

import { defaultChaiLibrary } from "@chaibuilder/sdk";
import { registerChaiLibrary, registerChaiBlockSettingWidget } from "@chaibuilder/sdk/runtime/client";
import "@chaibuilder/sdk/styles";
import { BuilderLayout } from "@chaibuilder/sdk/pages/layout";
import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import dynamic from "next/dynamic";
import { useEffect, useCallback, useState } from "react";
import "@/blocks";
import { langlionLibrary } from "@/lib/blocks-library";
import { GroupTypePickerWidget } from "@/blocks/widgets/group-type-picker";
import { TrainerPickerWidget } from "@/blocks/widgets/trainer-picker";

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

function usePageTypeMap() {
  const [pageTypeMap, setPageTypeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/editor/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GET_WEBSITE_PAGES", data: {} }),
    })
      .then((r) => r.json())
      .then((pages: { slug: string; pageType: string }[]) => {
        const map: Record<string, string> = {};
        for (const p of pages) map[p.slug] = p.pageType;
        setPageTypeMap(map);
      })
      .catch(() => {});
  }, []);

  return pageTypeMap;
}

export default function Editor() {
  const pageTypeMap = usePageTypeMap();
  const getAccessToken = useCallback(async () => MOCK_ACCESS_TOKEN, []);

  const getPreviewUrl = useCallback(
    (slug: string) => {
      const pageType = pageTypeMap[slug];
      const prefix = pageType === "blog_post" ? "blog/" : "";
      return `/api/preview?slug=${prefix}${slug}`;
    },
    [pageTypeMap],
  );

  const getLiveUrl = useCallback(
    (slug: string) => {
      const pageType = pageTypeMap[slug];
      const prefix = pageType === "blog_post" ? "blog/" : "";
      return `/api/preview?disable=true&slug=${prefix}${slug}`;
    },
    [pageTypeMap],
  );

  return (
    <ChaiWebsiteBuilder
      layout={BuilderLayout}
      flags={{
        dragAndDrop: true,
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
