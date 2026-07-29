import { Suspense, lazy } from "react";
import { useIsLanguagePageCreated } from "~/pages/hooks/pages/use-is-languagep-page-created";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";

const NoLanguagePageContent = lazy(() => import("./no-language-page-content"));

const NoLanguagePageDialog = () => {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang");
  const isLanguagePageCreated = useIsLanguagePageCreated(lang as string);

  if (isLanguagePageCreated) return null;

  return (
    <Suspense>
      <NoLanguagePageContent />
    </Suspense>
  );
};

export default NoLanguagePageDialog;
