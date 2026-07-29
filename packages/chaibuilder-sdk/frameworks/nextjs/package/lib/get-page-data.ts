import { getChaiCollection, getChaiGlobalData, getChaiPageType } from "@chaibuilder/sdk/runtime";
import type { ChaiBlock, ChaiPageProps } from "@chaibuilder/sdk/types";
import { get } from "lodash";

export async function getPageData<T = Record<string, unknown>>(args: {
  blocks: ChaiBlock[];
  pageProps: ChaiPageProps;
  pageType: string;
  lang: string;
  draftMode: boolean;
}): Promise<T> {
  const { blocks, pageProps, pageType, lang, draftMode } = args;

  const registeredPageType = getChaiPageType(pageType);

  // Get all collection repeater blocks
  const collectionRepeaterBlocks = blocks.filter(
    (block) => block._type === "Repeater" && block?.repeaterItems?.includes("{{#"),
  );

  // Prepare collection data promises
  const collectionPromises =
    collectionRepeaterBlocks.length > 0
      ? collectionRepeaterBlocks.map((block) => {
          const collectionId: string = block.repeaterItems.replace("{{#", "").replace("}}", "");
          const chaiCollection = getChaiCollection(collectionId);

          return chaiCollection
            ?.fetch({
              lang,
              draft: draftMode,
              inBuilder: false,
              pageProps,
              block,
            })
            .then((data: any) => ({
              [`#${collectionId}/${block._id}`]: get(data, "items", []) ?? [],
              [`#${collectionId}/${block._id}/totalItems`]: get(data, "totalItems", -1) ?? -1,
            }))
            .catch(() => ({
              [`#${collectionId}/${block._id}`]: [],
              [`#${collectionId}/${block._id}/totalItems`]: -1,
            }));
        })
      : [];

  // Execute all async operations in parallel
  const [globalData, pageData, ...collectionResults] = await Promise.all([
    getChaiGlobalData({ lang, draft: draftMode, inBuilder: false }),
    registeredPageType?.dataProvider?.({
      lang,
      draft: draftMode,
      inBuilder: false,
      pageProps,
    }) || Promise.resolve({}),
    ...collectionPromises,
  ]);

  // Combine collection data
  const collectionData = collectionResults.reduce(
    (acc: Record<string, unknown>, block: Record<string, unknown>) => {
      return { ...acc, ...block };
    },
    {} as Record<string, unknown>,
  );

  return {
    ...pageData,
    global: globalData,
    ...collectionData,
  } as T;
}
