import { db, safeQuery, schema } from "@chaibuilder/sdk/actions";
import type { ChaiWebsiteSetting } from "@chaibuilder/sdk/types";
import { eq } from "drizzle-orm";

export async function getSiteSettings(appId: string, draftMode: boolean): Promise<ChaiWebsiteSetting> {
  const table = draftMode ? db.query.apps : db.query.appsOnline;
  const { data: settings, error } = await safeQuery(() =>
    table.findFirst({
      where: eq(schema.apps.id, appId),
      columns: {
        theme: true,
        fallbackLang: true,
        languages: true,
        settings: true,
        designTokens: true,
      },
    }),
  );

  if (error || !settings) {
    throw new Error("SITE_SETTINGS_NOT_FOUND");
  }

  return { ...settings, appKey: "" } as ChaiWebsiteSetting;
}
