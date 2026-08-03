import { has } from "lodash-es";
import { lazy } from "react";
import { Button } from "~/components/ui/button";
import { SeoIcon } from "~/pages/client/components/seo-icon";
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
      <SeoIcon className="h-5 w-5" />
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
