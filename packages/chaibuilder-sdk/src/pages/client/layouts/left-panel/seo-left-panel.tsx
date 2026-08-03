import { lazy, Suspense } from "react";
import { useLeftPanelMode } from "~/hooks/use-theme";

const SeoPanel = lazy(() => import("~/pages/client/components/seo-panel"));

/**
 * Inline (non-modal) variant of the SEO panel, rendered inside the left panel
 * when the "seo" topbar mode is active.
 */
export const SeoLeftPanel = () => {
  const [, setMode] = useLeftPanelMode();

  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<div>Loading...</div>}>
        <SeoPanel inline onCancel={() => setMode("sections")} />
      </Suspense>
    </div>
  );
};

export default SeoLeftPanel;
