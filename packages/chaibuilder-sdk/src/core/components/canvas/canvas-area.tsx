import { noop } from "lodash-es";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "~/components/ui/skeleton";
import StaticCanvas from "~/core/components/canvas/static/static-canvas";
import { FallbackError } from "~/core/components/fallback-error";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useCodeEditor } from "~/hooks/use-code-editor";

const CodeEditor = React.lazy(() => import("~/core/components/canvas/static/code-editor"));

const CanvasArea: React.FC = () => {
  const [codeEditor] = useCodeEditor();
  const onErrorFn = useBuilderProp("onError", noop);
  return (
    <div className="flex h-full max-h-full w-full flex-1 flex-col">
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
