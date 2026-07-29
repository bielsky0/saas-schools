import { useAtom } from "jotai";
import { isArray } from "lodash-es";
import { toast } from "sonner";
import { lsThemeAtom } from "~/atoms/ui";
import { ChaiBuilderEditor, defaultChaiLibrary } from "~/core/main";
import "~/index.css";
import { lsBlocksAtom, lsDesignTokensAtom } from "~/routes/demo/atoms-dev";
import { EXTERNAL_DATA } from "~/routes/demo/EXTERNAL_DATA";
import { PARTIALS } from "~/routes/demo/PARTIALS";
import { defaultShadcnPreset } from "~/routes/demo/THEME_PRESETS";
import Topbar from "~/routes/demo/top-bar";
import { registerChaiFont } from "~/runtime";
import { registerChaiLibrary, registerChaiTopBar } from "~/runtime/client";
import { ChaiSavePageData, ChaiSaveWebsiteData, ChaiTheme } from "~/types/chaibuilder-editor-props";
import { ChaiBlock } from "~/types/common";
import { loadWebBlocks } from "~/web-blocks";

loadWebBlocks();
registerChaiTopBar(Topbar);
registerChaiLibrary("chai", defaultChaiLibrary(import.meta.env.DEV ? { baseUrl: "http://localhost:5173" } : {}));
registerChaiFont("Bungee", {
  src: [{ url: "/fonts/bungee/Bungee-Regular.woff2", format: "woff2" }],
  fallback: "serif",
});

function ChaiBuilderDefault() {
  const [blocks] = useAtom(lsBlocksAtom);
  const [theme, setTheme] = useAtom(lsThemeAtom);
  const [designTokensValue, setDesignTokensValue] = useAtom(lsDesignTokensAtom);
  return (
    <ChaiBuilderEditor
      pageId="header"
      designTokens={designTokensValue}
      flags={{
        copyPaste: true,
        darkMode: false,
        exportCode: true,
        // dataBinding: false,
        importHtml: true,
        importTheme: true,
        dragAndDrop: true,
      }}
      gotoPage={(args) => {
        console.log("gotoPage", args);
      }}
      permissions={null}
      // permissions={[]}
      pageExternalData={EXTERNAL_DATA}
      fallbackLang="en"
      languages={["fr"]}
      themePresets={[{ shadcn_default: defaultShadcnPreset }]}
      theme={theme}
      autoSave={true}
      blocks={blocks}
      onSave={async ({ blocks, needTranslations }: ChaiSavePageData) => {
        console.log("onSave", blocks, needTranslations);
        localStorage.setItem("chai-builder-blocks", JSON.stringify(blocks));
        toast.success("Page saved successfully");
        await new Promise((resolve) => setTimeout(resolve, 100));
        return true;
      }}
      onSaveWebsiteData={async ({ type, data }: ChaiSaveWebsiteData) => {
        console.log("onSaveWebsiteData", type, data);
        if (type === "THEME") {
          localStorage.setItem("chai-builder-theme", JSON.stringify(data));
          setTheme(data as ChaiTheme);
        } else if (type === "DESIGN_TOKENS") {
          localStorage.setItem("chai-builder-design-tokens", JSON.stringify(data));
          setDesignTokensValue(data);
        }
        return true;
      }}
      getPartialBlockBlocks={async (partialBlockKey: string) => {
        const blocks = PARTIALS[partialBlockKey] ?? PARTIALS["header"];
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(blocks);
          }, 100);
        });
      }}
      getPartialBlocks={async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              header: {
                type: "GlobalBlock",
                name: "Header",
                description: "Header",
              },
              footer: {
                type: "GlobalBlock",
                name: "Footer",
                description: "Footer",
              },
              partial: {
                type: "PartialBlock",
                name: "Partial Name here",
                description: "Partial",
              },
            });
          }, 1000);
        });
      }}
      pageTypes={[{ key: "page", name: "Pages" }]}
      searchPageTypeItems={async (pageTypeKey: string, query: string | string[]) => {
        console.log("searchPageTypeItems", pageTypeKey, query, "query");
        if (pageTypeKey === "page") {
          const items = [
            { id: "uuid-1", name: "Page 1", slug: "/page-1" },
            { id: "uuid-2", name: "Page 2", slug: "/uuid1" },
            { id: "uuid-3", name: "About", slug: "/about" },
            { id: "uuid-4", name: "Contact", slug: "/sss" },
          ];
          await new Promise((r) => setTimeout(r, 500));
          return items.filter((item) => {
            if (isArray(query)) return query?.includes(item.id);
            return item.name.toLowerCase().includes(query.toString().toLowerCase());
          });
        }
        return [];
      }}
      getBlockAsyncProps={async (args: { block: ChaiBlock }) => {
        console.log("getBlockAsyncProps", args);
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                items: Array.from({ length: 2 }, (_, i) => ({
                  name: `Promotion ${i + 1}`,
                  date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  image: `https://picsum.photos/500/300`,
                })),
                totalItems: 30,
              }),
            2000,
          ),
        );
      }}
      collections={[
        {
          id: "promotions",
          name: "Promotions",
          description: "Promotions",
          filters: [
            {
              id: "filter-1",
              name: "Promotions Filter 1",
              description: "Promotions Filter 1",
            },
          ],
          sorts: [
            {
              id: "sort-1",
              name: "Promotions Sort 1",
              description: "Promotions Sort 1",
            },
          ],
        },
        {
          id: "vehicles",
          name: "Vehicles",
          description: "Vehicles",
          filters: [
            {
              id: "filter-1",
              name: "Vehicles Filter 1",
              description: "Vehicles Filter 1",
            },
          ],
          sorts: [
            {
              id: "sort-1",
              name: "Vehicles Sort 1",
              description: "Vehicles Sort 1",
            },
          ],
        },
      ]}
    />
  );
}

export default ChaiBuilderDefault;
