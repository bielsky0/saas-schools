import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";

/**
 * API endpoint for the GroupTypePicker custom Payload field.
 *
 * Returns group types for the current organization so the admin can pick
 * which types to show in a ScheduleGrid block.
 *
 * Guard: requires cms.manage permission (same as editing CMS pages).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const ctx = await requireOrgPermission("cms.manage");

  if (ctx.org.id !== orgId) {
    return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
  }

  const rows = await withTenant(ctx.org.id, async (tx) => {
    return tx.execute<{ id: string; name: string }>(
      sql`
        SELECT id, name FROM group_type
        WHERE organization_id = ${ctx.org.id}
          AND deleted_at IS NULL
        ORDER BY name ASC
      `,
    );
  });

  return NextResponse.json(rows);
}
