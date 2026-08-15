import { sql } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import type { ChaiTheme, ComponentTokens } from "@chaibuilder/sdk/types";

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

/**
 * Motyw + tokeny komponentowe w JEDNYM zapytaniu. Route/ThemeInjector używają tej
 * funkcji zamiast dwóch osobnych SELECT-ów na wspólnej transakcji — pojedyncze
 * zapytanie nie może "zatruć" transakcji (current transaction is aborted) przy
 * awarii drugiego z nich.
 */
export async function getActiveBuilderThemeAndTokens(
  tx: TenantDb,
  organizationId: string,
): Promise<{ theme: ChaiTheme | null; componentTokens: ComponentTokens | null }> {
  try {
    const [row] = await tx.execute<{ theme: ChaiTheme; component_tokens: ComponentTokens }>(
      sql`
        SELECT theme, component_tokens FROM builder_theme
        WHERE organization_id = ${organizationId} AND is_active = true
        LIMIT 1
      `,
    );
    return {
      theme: row?.theme ?? null,
      componentTokens: row?.component_tokens ?? null,
    };
  } catch (e) {
    console.warn("[builder-theme-data] getActiveBuilderThemeAndTokens failed:", e);
    return { theme: null, componentTokens: null };
  }
}

/**
 * Aktualizuje tokeny komponentowe na aktywnym wierszu builder_theme.
 * Gdy brak aktywnego wiersza (motyw jeszcze nie zapisany), wstawia nowy z
 * pustym motywem — dzięki temu zapis tokenów nigdy nie ginie.
 */
export async function upsertBuilderComponentTokens(
  tx: TenantDb,
  organizationId: string,
  tokens: ComponentTokens,
  userId: string | null,
): Promise<void> {
  await tx.execute(
    sql`
      UPDATE builder_theme
      SET component_tokens = ${JSON.stringify(tokens)}::jsonb,
          updated_by = ${userId ?? null},
          updated_at = now()
      WHERE organization_id = ${organizationId} AND is_active = true
    `,
  );
  await tx.execute(
    sql`
      INSERT INTO builder_theme (organization_id, theme, component_tokens, is_active, created_by, updated_by)
      SELECT ${organizationId}, '{}'::jsonb, ${JSON.stringify(tokens)}::jsonb, true,
             ${userId ?? null}, ${userId ?? null}
      WHERE NOT EXISTS (
        SELECT 1 FROM builder_theme WHERE organization_id = ${organizationId} AND is_active = true
      )
    `,
  );
}
