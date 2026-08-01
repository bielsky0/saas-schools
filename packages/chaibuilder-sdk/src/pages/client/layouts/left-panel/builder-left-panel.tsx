import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { SectionsTab } from "./sections-tab";
import { ThemeTab } from "./theme-tab";

export const BuilderLeftPanel = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full max-h-full w-[300px] flex-col border-r border-gray-200 bg-white text-gray-900">
      <Tabs defaultValue="sections" className="flex h-full max-h-full flex-col">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="sections">{t("Sections")}</TabsTrigger>
          <TabsTrigger value="theme">{t("Theme")}</TabsTrigger>
          <TabsTrigger value="pages">{t("Pages")}</TabsTrigger>
        </TabsList>
        <TabsContent value="sections" className="no-scrollbar h-full max-h-full overflow-y-auto px-3 py-2">
          <Suspense fallback={<div>Loading...</div>}>
            <SectionsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="theme" className="no-scrollbar h-full max-h-full overflow-y-auto px-3 py-3">
          <Suspense fallback={<div>Loading...</div>}>
            <ThemeTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="pages" className="px-4 py-4 text-sm text-muted-foreground">
          {t("Coming soon")}...
        </TabsContent>
      </Tabs>
    </div>
  );
};
