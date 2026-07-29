import { db, safeQuery, schema } from "@chaibuilder/sdk/actions";
import { and, eq, like, or } from "drizzle-orm";
import { get, isEmpty, keys, reverse, sortBy, take } from "lodash";
import { ChaiPartialPage } from "../types";

export async function getPageBySlug(
  slug: string,
  appId: string,
  draftMode: boolean,
  dynamicSegments: Record<string, string>,
): Promise<ChaiPartialPage> {
  const table = draftMode ? db.query.appPages : db.query.appPagesOnline;
  const schemaTable = draftMode ? schema.appPages : schema.appPagesOnline;

  // Step 1: Check for direct slug match (static pages)
  const { data: staticPage } = await safeQuery(() =>
    table.findFirst({
      where: and(eq(schemaTable.app, appId), eq(schemaTable.slug, slug), eq(schemaTable.dynamic, false)),
      columns: {
        id: true,
        slug: true,
        lang: true,
        primaryPage: true,
        name: true,
        pageType: true,
      },
    }),
  );

  if (staticPage) {
    return {
      ...staticPage,
      languagePageId: staticPage.id,
      pageType: staticPage.pageType ?? "",
    };
  }

  // Step 2: Handle dynamic routing
  // Extract segments from slug: /blog/post-1 -> segment1: /blog, segment2: /blog/post-1
  const strippedSlug = slug.slice(1);
  const segment1 = `/${take(strippedSlug.split("/"), 1).join("/")}`;
  const segment2 = `/${take(strippedSlug.split("/"), 2).join("/")}`;

  // Get all dynamic pages that match segments
  const { data: dynamicPages } = await safeQuery(() =>
    table.findMany({
      where: and(
        eq(schemaTable.app, appId),
        eq(schemaTable.dynamic, true),
        or(like(schemaTable.slug, `%${segment1}%`), like(schemaTable.slug, `%${segment2}%`)),
      ),
      columns: {
        id: true,
        slug: true,
        lang: true,
        primaryPage: true,
        name: true,
        pageType: true,
        dynamicSlugCustom: true,
      },
    }),
  );

  if (!dynamicPages || dynamicPages.length === 0) {
    throw new Error("PAGE_NOT_FOUND");
  }

  // Step 3: Sort pages by slug complexity (more segments = higher priority)
  const sortedPages = reverse(sortBy(dynamicPages, (page) => page.slug.split("/").length));

  // Step 4: Sort by dynamicSegments keys order if provided
  const dynamicKeys = keys(dynamicSegments);
  if (dynamicKeys.length > 0) {
    sortedPages.sort((a, b) => {
      const aIndex = dynamicKeys.indexOf(a.pageType || "");
      const bIndex = dynamicKeys.indexOf(b.pageType || "");
      // If not found, put at the end
      const aOrder = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const bOrder = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return aOrder - bOrder;
    });
  }

  // Step 5: Try to match slug with dynamic page patterns
  for (const page of sortedPages) {
    if (isEmpty(page.slug)) {
      continue;
    }

    const pageType = page.pageType || "";
    const regex = get(dynamicSegments, pageType, "");
    const customSlug = page.dynamicSlugCustom || "";

    // Build regex pattern: pageSlug + dynamicSegment regex + custom regex
    const pattern = page.slug + regex + customSlug;
    const reg = new RegExp(pattern);
    const match = slug.match(reg);

    if (match && match[0] === slug) {
      return {
        ...page,
        slug,
        pageType: page.pageType ?? "",
        languagePageId: page.id,
      };
    }
  }

  throw new Error("PAGE_NOT_FOUND");
}
