import { db, safeQuery, schema } from "@chaibuilder/sdk/actions";
import { getChaiPageType } from "@chaibuilder/sdk/runtime";
import { and, eq } from "drizzle-orm";
import { startsWith } from "lodash";

export async function resolveLink(
  href: string,
  lang: string,
  appId: string,
  draftMode: boolean,
  fallbackLang: string,
): Promise<string> {
  // href is of format "pageType:${pageTypeKey}:${id}"
  if (!startsWith(href, "pageType:")) {
    return href;
  }

  const parts = href.split(":");
  if (parts.length !== 3 || !parts[1] || !parts[2]) {
    return href;
  }
  const pageTypeKey = parts[1];
  const id = parts[2];
  const pageType = getChaiPageType(pageTypeKey);

  if (!pageType) {
    return href;
  }

  if (pageType.resolveLink) {
    return await pageType.resolveLink(id, draftMode, lang);
  }

  const table = draftMode ? db.query.appPages : db.query.appPagesOnline;
  const { data: page } = await safeQuery(() =>
    table.findFirst({
      where: and(eq(schema.appPages.app, appId), eq(schema.appPages.id, id)),
    }),
  );

  if (!page) {
    return "/not-found";
  }

  return page.slug;
}
