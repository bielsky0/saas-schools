"use server"

import { sql } from "drizzle-orm"

import { requireOrgPermission } from "@/features/organizations/context"
import { withTenant } from "@/lib/db/tenant"

type PageEntry = {
  id: string
  title: string
  slug: string
}

/**
 * Returns all pages for the caller's organization, ordered by title.
 * Used by the page-switcher dropdown in the document edit view.
 *
 * IDOR guard: orgId is resolved from the session, never from client input.
 */
export async function listOrgPages(): Promise<PageEntry[]> {
  const ctx = await requireOrgPermission("cms.manage")

  const rows = await withTenant(ctx.org.id, (tx) =>
    tx.execute<PageEntry>(
      sql`
        SELECT id, title, slug FROM pages
        WHERE organization_id = ${ctx.org.id}
          AND deleted_at IS NULL
        ORDER BY title ASC
      `,
    ),
  )

  return rows as unknown as PageEntry[]
}
