"use server"

import { requireOrgPermission } from "@/features/organizations/context"
import { withTenant } from "@/lib/db/tenant"

import { getBlockGrants } from "./tenant-block-access"
import { getCustomBlockKeys } from "./block-registry"

/**
 * Server action scoped to the caller's organization session.
 *
 * IDOR guard: organizationId is resolved from the session via
 * requireOrgPermission, never from a client-passed parameter.
 * This is the same pattern used by every other server action in
 * the project (see src/features/cms/actions.ts as reference).
 *
 * Returns the list of granted custom block keys AND the full list
 * of custom block keys so the client can filter which blocks to
 * show in the "Add" menu without needing to import server-only
 * block registry code on the client.
 */
export async function getBlockAccess(): Promise<{
  granted: string[]
  customKeys: string[]
}> {
  const ctx = await requireOrgPermission("cms.manage")

  const granted = await withTenant(ctx.org.id, (tx) =>
    getBlockGrants(tx, ctx.org.id),
  )

  return {
    granted,
    customKeys: getCustomBlockKeys(),
  }
}
