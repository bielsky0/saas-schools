import { and, eq, ne, notInArray } from "drizzle-orm";

import { page } from "@/lib/db/schema/pages";
import { listCollectionContentPageTypes } from "@/lib/cms-collection-data";
import type { TenantDb } from "@/lib/db/tenant";

export async function getPageBySlug(tx: TenantDb, organizationId: string, slug: string) {
  const collectionPageTypes = await listCollectionContentPageTypes(tx, organizationId);
  const conds = [
    eq(page.organizationId, organizationId),
    eq(page.slug, slug),
    ne(page.status, "archived"),
  ];
  if (collectionPageTypes.length > 0) {
    conds.push(notInArray(page.pageType, collectionPageTypes));
  }
  const [row] = await tx.select().from(page).where(and(...conds)).limit(1);
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
