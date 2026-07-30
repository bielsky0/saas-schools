import { and, eq, ne } from "drizzle-orm";

import { page } from "@/lib/db/schema/pages";
import type { TenantDb } from "@/lib/db/tenant";

export async function getPageBySlug(tx: TenantDb, organizationId: string, slug: string) {
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, organizationId),
        eq(page.slug, slug),
        ne(page.status, "archived"),
        ne(page.pageType, "blog_post"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getHomePage(tx: TenantDb, organizationId: string) {
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, organizationId),
        eq(page.isHome, true),
        ne(page.status, "archived"),
      ),
    )
    .limit(1);
  return row ?? null;
}
