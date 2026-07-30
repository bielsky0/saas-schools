import { sql } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";

export type ThemeRow = {
  id: string;
  fontPrimary: string;
  fontHeading: string;
  colorPrimary: string;
  colorSecondary: string;
  borderRadius: string;
  organizationId: string;
};

export async function getTheme(
  tx: TenantDb,
  organizationId: string,
): Promise<ThemeRow | null> {
  const [row] = await tx.execute<ThemeRow>(
    sql`
      SELECT
        t.id,
        t.font_primary AS "fontPrimary",
        t.font_heading AS "fontHeading",
        t.color_primary AS "colorPrimary",
        t.color_secondary AS "colorSecondary",
        t.border_radius AS "borderRadius",
        t.organization_id AS "organizationId"
      FROM theme t
      WHERE t.organization_id = ${organizationId}
      LIMIT 1
    `,
  );
  return (row as ThemeRow) ?? null;
}
