"use client";

// Shared ChaiBuilder editor chrome (apex-dashboard-plan 4.3).
//
// One client component for BOTH editors: the tenant's `{subdomain}/editor` and
// the apex panel's `/admin/orgs/{orgId}/builder`. The only difference is the
// `apiUrl` the SDK + these bootstrap fetches POST against — the tenant route
// (`/editor/api`) resolves the org from the subdomain header, the apex route
// (`/admin-editor/api/{orgId}`) from the URL segment — and the "back" target.
//
// SPIKE NOTE (4.3): the apex builder's preview/live links still point at
// `/api/preview`, which resolves the org from the subdomain header. There is no
// subdomain on apex, so preview inside the panel shell is a known gap until a
// follow-up threads orgId through the preview URL — visual editing is the
// spike's goal and is unaffected.

import { defaultChaiLibrary } from "@chaibuilder/sdk";
import { registerChaiLibrary, registerChaiBlockSettingWidget } from "@chaibuilder/sdk/runtime/client";
import "@chaibuilder/sdk/styles";
import { BuilderLayout } from "@chaibuilder/sdk/pages/layout";
import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import dynamic from "next/dynamic";
import { useEffect, useCallback, useState } from "react";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import "@/blocks";
import { langlionLibrary } from "@/lib/blocks-library";
import { GroupTypePickerWidget } from "@/blocks/widgets/group-type-picker";
import { TrainerPickerWidget } from "@/blocks/widgets/trainer-picker";
import plTranslations from "./translations/builder-pl.json";

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

function usePageTypeMap(apiUrl: string) {
  const [pageTypeMap, setPageTypeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(apiUrl, {
      credentials: "include",
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
  }, [apiUrl]);

  return pageTypeMap;
}

function useUiLocale(apiUrl: string) {
  const [uiLocale, setUiLocale] = useState("pl");

  useEffect(() => {
    fetch(apiUrl, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GET_WEBSITE_DATA", data: {} }),
    })
      .then((r) => r.json())
      .then((data: { uiLocale?: string }) => {
        if (data?.uiLocale) setUiLocale(data.uiLocale);
      })
      .catch(() => {});
  }, [apiUrl]);

  return uiLocale;
}

function useDevRole(apiUrl: string) {
  const [role, setRole] = useState<"admin" | "guest">("guest");

  useEffect(() => {
    fetch(apiUrl, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GET_WEBSITE_DATA", data: {} }),
    })
      .then((r) => r.json())
      .then((data: { role?: "admin" | "guest" }) => {
        let nextRole: "admin" | "guest" = data?.role ?? "guest";
        const devOverride =
          process.env.NODE_ENV === "development" &&
          new URLSearchParams(window.location.search).get("devMode") === "1";
        if (devOverride) nextRole = "admin";
        setRole(nextRole);
      })
      .catch(() => {});
  }, [apiUrl]);

  return role;
}

export default function BuilderEditor({ apiUrl = "/editor/api" }: { apiUrl?: string }) {
  const pageTypeMap = usePageTypeMap(apiUrl);
  const devRole = useDevRole(apiUrl);
  const uiLocale = useUiLocale(apiUrl);
  const getAccessToken = useCallback(async () => MOCK_ACCESS_TOKEN, []);

  const isApex = apiUrl.startsWith("/admin-editor");
  const orgIdFromApexApi = apiUrl.split("/")[3];
  const backUrl = isApex && orgIdFromApexApi ? `/admin/orgs/${orgIdFromApexApi}/console` : "/dashboard";

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

  const askAiCallBack = useCallback(
    async (type: "styles" | "content", prompt: string, blocks: ChaiBlock[], lang: string) => {
      try {
        const response = await fetch(apiUrl, {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ASK_AI",
            data: {
              messages: [{ role: "user", content: prompt }],
              model: "gpt-4o-mini",
              context: { type, blocks, lang },
            },
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { blocks: [], error: { message: err.error || "AI request failed" } };
        }

        const text = await response.text();
        const htmlMatch = text.match(/--HTML--([\s\S]*?)--ENDHTML--/);
        if (!htmlMatch?.[1]) return { blocks: [] };

        return { blocks: [] as ChaiBlock[], html: htmlMatch[1].trim() };
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI error";
        return { blocks: [], error: { message } };
      }
    },
    [apiUrl],
  );

  return (
    <ChaiWebsiteBuilder
      layout={BuilderLayout}
      smallScreenComponent={false}
      flags={{
        dragAndDrop: true,
        ai: true,
        darkMode: true,
        devMode: devRole === "admin",
      }}
      currentUser={null}
      locale={uiLocale}
      translations={{ pl: plTranslations }}
      autoSave
      autoSaveActionsCount={5}
      getAccessToken={getAccessToken}
      apiUrl={apiUrl}
      getPreviewUrl={getPreviewUrl}
      getLiveUrl={getLiveUrl}
      getBackUrl={backUrl}
      askAiCallBack={askAiCallBack}
    />
  );
}
