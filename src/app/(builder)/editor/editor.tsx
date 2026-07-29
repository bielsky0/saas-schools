"use client";

import { defaultChaiLibrary } from "@chaibuilder/sdk";
import { registerChaiLibrary } from "@chaibuilder/sdk/runtime/client";
import "@chaibuilder/sdk/styles";
import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import dynamic from "next/dynamic";
import { useCallback } from "react";

const ChaiWebsiteBuilder = dynamic(
  () => import("@chaibuilder/sdk/pages").then((mod) => mod.ChaiWebsiteBuilder),
  { ssr: false },
);

loadWebBlocks();
registerChaiLibrary("chai-library", defaultChaiLibrary());

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
