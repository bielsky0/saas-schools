import { sql } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import type { ChaiTheme } from "@chaibuilder/sdk/types";

export async function getActiveBuilderTheme(
  tx: TenantDb,
  organizationId: string,
): Promise<ChaiTheme | null> {
  try {
    const [row] = await tx.execute<{ theme: ChaiTheme }>(
      sql`
        SELECT theme FROM builder_theme
        WHERE organization_id = ${organizationId} AND is_active = true
        LIMIT 1
      `,
    );
    return row?.theme ?? null;
  } catch (e) {
    console.warn("[builder-theme-data] getActiveBuilderTheme failed:", e);
    return null;
  }
}

export async function upsertBuilderTheme(
  tx: TenantDb,
  organizationId: string,
  theme: ChaiTheme,
  userId: string | null,
): Promise<void> {
  await tx.execute(
    sql`
      UPDATE builder_theme
      SET is_active = false, updated_at = now()
      WHERE organization_id = ${organizationId} AND is_active = true
    `,
  );
  await tx.execute(
    sql`
      INSERT INTO builder_theme (organization_id, theme, is_active, created_by, updated_by)
      VALUES (${organizationId}, ${JSON.stringify(theme)}::jsonb, true, ${userId ?? null}, ${userId ?? null})
    `,
  );
}
