import { and, eq } from "drizzle-orm";

import { withSystemBypass } from "@/lib/db/system";

import type { TenantDb } from "@/lib/db/tenant";
import { tenantBlockAccess as tenantBlockAccessTable } from "@/lib/db/schema/cms-tenant-block-access";

export async function getBlockGrants(
  tx: TenantDb,
  organizationId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ blockKey: tenantBlockAccessTable.blockKey })
    .from(tenantBlockAccessTable)
    .where(eq(tenantBlockAccessTable.organizationId, organizationId));
  return rows.map((r) => r.blockKey);
}

export async function hasBlockGrant(
  tx: TenantDb,
  organizationId: string,
  blockKey: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: tenantBlockAccessTable.id })
    .from(tenantBlockAccessTable)
    .where(
      and(
        eq(tenantBlockAccessTable.organizationId, organizationId),
        eq(tenantBlockAccessTable.blockKey, blockKey),
      ),
    )
    .limit(1);
  return !!row;
}

export async function grantBlock(
  tx: TenantDb,
  input: {
    organizationId: string;
    blockKey: string;
    grantedByUserId: string;
  },
): Promise<void> {
  await tx
    .insert(tenantBlockAccessTable)
    .values({
      organizationId: input.organizationId,
      blockKey: input.blockKey,
      grantedByUserId: input.grantedByUserId,
    })
    .onConflictDoNothing();
}

export async function revokeBlock(
  tx: TenantDb,
  organizationId: string,
  blockKey: string,
): Promise<boolean> {
  const [row] = await tx
    .delete(tenantBlockAccessTable)
    .where(
      and(
        eq(tenantBlockAccessTable.organizationId, organizationId),
        eq(tenantBlockAccessTable.blockKey, blockKey),
      ),
    )
    .returning({ id: tenantBlockAccessTable.id });
  return !!row;
}

export type GrantRow = {
  organizationId: string;
  blockKey: string;
  grantedAt: Date;
  grantedByUserId: string;
};

export async function listAllGrants(): Promise<GrantRow[]> {
  return withSystemBypass("cms-blocks list all grants", async (tx) => {
    return tx
      .select({
        organizationId: tenantBlockAccessTable.organizationId,
        blockKey: tenantBlockAccessTable.blockKey,
        grantedAt: tenantBlockAccessTable.grantedAt,
        grantedByUserId: tenantBlockAccessTable.grantedByUserId,
      })
      .from(tenantBlockAccessTable);
  });
}
