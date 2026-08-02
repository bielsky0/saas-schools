import { LayoutTemplate } from "lucide-react";
import { noop } from "lodash-es";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { Skeleton } from "~/components/ui/skeleton";
import StaticCanvas from "~/core/components/canvas/static/static-canvas";
import { FallbackError } from "~/core/components/fallback-error";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useCodeEditor } from "~/hooks/use-code-editor";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useCollections } from "~/pages/hooks/pages/use-collections";

const CodeEditor = React.lazy(() => import("~/core/components/canvas/static/code-editor"));

const CanvasArea: React.FC = () => {
  const { t } = useTranslation();
  const [codeEditor] = useCodeEditor();
  const onErrorFn = useBuilderProp("onError", noop);
  const { context } = useEditorContext();
  const { data: collections = [] } = useCollections();

  const isTemplateMode = context.type === "template";
  const collection = isTemplateMode
    ? collections.find((c) => c.id === context.collectionId) ?? null
    : null;
  const postCount = collection?.postCount ?? 0;

  return (
    <div className="flex h-full max-h-full w-full flex-1 flex-col">
      {isTemplateMode && (
        <div className="flex shrink-0 items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800">
          <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t("Editing template layout — changes will affect {{count}} posts", { count: postCount })}.{" "}
            {t("Template data is shown as placeholders")}.
          </span>
        </div>
      )}
      <div className="relative flex h-full max-h-full flex-col overflow-hidden bg-gray-100/40">
        <Suspense fallback={<Skeleton className="h-full" />}>
          <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
            <StaticCanvas />
          </ErrorBoundary>
        </Suspense>
        {codeEditor ? (
          <Suspense fallback={<Skeleton className="h-full" />}>
            <CodeEditor />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
};

export default CanvasArea;
