import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { first } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { apiError } from "~/actions/lib";
import { ChaiBaseAction } from "./base-action";

type GetWebsiteSettingsActionData = {
  draft: boolean;
};

type GetWebsiteSettingsActionResponse = {
  fallbackLang: string;
  languages: string[]; // Making it more flexible to match database schema
  theme: any; // Making it more flexible to match database schema
  appKey: string;
  designTokens?: any;
  appChanges?: string[];
};

export class GetWebsiteSettingsAction extends ChaiBaseAction<
  GetWebsiteSettingsActionData,
  GetWebsiteSettingsActionResponse
> {
  protected getValidationSchema() {
    return z.object({
      draft: z.boolean(),
    });
  }

  async execute(data: GetWebsiteSettingsActionData): Promise<GetWebsiteSettingsActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;
    const { draft } = data;

    // Use the appropriate table based on draft flag
    const targetTable = draft ? schema.apps : schema.appsOnline;

    const { data: config, error } = await safeQuery(() =>
      db
        .select({
          theme: targetTable.theme,
          fallbackLang: targetTable.fallbackLang,
          languages: targetTable.languages,
          settings: targetTable.settings,
          designTokens: targetTable.designTokens,
          changes: targetTable.changes,
        })
        .from(targetTable)
        .where(eq(targetTable.id, appId))
        .limit(1),
    );

    if (error) {
      throw apiError("ERROR_PROJECT_CONFIG", error);
    }

    if (!config || config.length === 0) {
      throw apiError("PROJECT_NOT_FOUND", new Error("Project not found"));
    }

    const settings = first(config);

    const appChanges = ((settings as any)?.changes ?? []) as string[];

    return {
      ...this.getDefaultSettings(),
      ...settings,
      // Handle null/undefined values by providing defaults
      fallbackLang: settings?.fallbackLang || this.getDefaultSettings().fallbackLang,
      languages: (settings?.languages as string[]) || this.getDefaultSettings().languages,
      theme: settings?.theme || this.getDefaultSettings().theme,
      // Generate deterministic app key like the original implementation
      appKey: this.generateDeterministicUuid(appId),
      appChanges,
    };
  }

  getDefaultSettings() {
    return {
      fallbackLang: "en",
      languages: [],
      theme: {
        colors: {
          card: ["#FFFFFF", "#09090B"],
          ring: ["#2563EB", "#3B82F6"],
          input: ["#E4E4E7", "#27272A"],
          muted: ["#F4F4F5", "#27272A"],
          accent: ["#F4F4F5", "#27272A"],
          border: ["#E4E4E7", "#27272A"],
          popover: ["#FFFFFF", "#09090B"],
          primary: ["#2563EB", "#3B82F6"],
          secondary: ["#F4F4F5", "#27272A"],
          background: ["#FFFFFF", "#09090B"],
          foreground: ["#09090B", "#FFFFFF"],
          destructive: ["#EF4444", "#7F1D1D"],
          "card-foreground": ["#09090B", "#FFFFFF"],
          "muted-foreground": ["#71717A", "#A1A1AA"],
          "accent-foreground": ["#09090B", "#FFFFFF"],
          "popover-foreground": ["#09090B", "#FFFFFF"],
          "primary-foreground": ["#FFFFFF", "#FFFFFF"],
          "secondary-foreground": ["#09090B", "#FFFFFF"],
          "destructive-foreground": ["#FFFFFF", "#FFFFFF"],
        },
        fontFamily: { body: "Roboto", heading: "Poppins" },
        borderRadius: "30px",
      },
      settings: {},
      designTokens: {},
    };
  }

  private generateDeterministicUuid(seed: string): string {
    // Create a deterministic hash from the seed
    const hash = createHash("sha256").update(seed).digest("hex");

    // Format as UUID v4 structure: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuid = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      "4" + hash.substring(13, 16), // Version 4
      ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20), // Variant bits
      hash.substring(20, 32),
    ].join("-");

    return uuid;
  }
}
