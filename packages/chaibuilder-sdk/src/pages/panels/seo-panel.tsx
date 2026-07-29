import { has } from "lodash-es";
import { lazy } from "react";
import { Button } from "~/components/ui/button";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { usePageType } from "~/pages/hooks/project/use-page-types";
const SeoPanel = lazy(() => import("../client/components/seo-panel"));

export const seoPanelId = "seo";

export const SeoButton = ({ isActive, show }: { isActive: boolean; show: () => void }) => {
  const { data: currentPage } = usePrimaryPage();
  const pageType = usePageType(currentPage?.pageType);

  if (!has(pageType, "hasSlug") || !pageType.hasSlug) return null;

  return (
    <Button size="icon" className="my-1 p-0" onClick={show} variant={isActive ? "default" : "ghost"}>
      <svg
        stroke="currentColor"
        fill="none"
        style={{ height: "20px", width: "20px" }}
        strokeWidth="2"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M7 8h-3a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-3"></path>
        <path d="M14 16h-4v-8h4"></path>
        <path d="M11 12h2"></path>
        <path d="M17 8m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"></path>
      </svg>
    </Button>
  );
};

export const seoPanel = {
  id: seoPanelId,
  label: "SEO",
  panel: SeoPanel,
  button: SeoButton,
  position: "top" as const,
  width: 600,
  view: "modal" as const,
};
