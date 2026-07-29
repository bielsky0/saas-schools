import { get } from "lodash-es";
import { LockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { useLanguages } from "~/hooks/use-languages";
import { BlurContainer } from "~/pages/client/components/chai-loader";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { useIsLanguagePageCreated } from "~/pages/hooks/pages/use-is-languagep-page-created";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";

const NoLanguagePageContent = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = searchParams.get("lang");
  const isLanguagePageCreated = useIsLanguagePageCreated(lang as string);
  const { setSelectedLang } = useLanguages();

  const handleSwitchToBaseLanguage = () => {
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete("lang");
    const newSearch = currentParams.toString();
    const newPath = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
    window.history.pushState({}, "", newPath);
    setSearchParams(currentParams);
    setSelectedLang("");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (isLanguagePageCreated) return null;
  const languageName = get(LANGUAGES, lang as keyof typeof LANGUAGES);

  return (
    <BlurContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LockIcon className="h-6 w-6 text-yellow-500" />
            {t("Page missing for")} "{languageName}" {t("language")}.
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            {t("Page is not available in the")} "{languageName}" {t("language. Either create the page in the")} "
            {languageName}"{t("language or switch to the base language.")}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSwitchToBaseLanguage} className="w-full" variant="destructive">
            {t("Switch to default language")}
          </Button>
        </CardFooter>
      </Card>
    </BlurContainer>
  );
};

export default NoLanguagePageContent;
