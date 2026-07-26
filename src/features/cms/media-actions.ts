"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation/state";

export async function deleteMediaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const mediaId = formData.get("mediaId");
  if (typeof mediaId !== "string" || !mediaId) {
    return { error: "Media ID is required" };
  }

  const actor = await resolveActor(ctx.session);

  const deleted = await withTenant(ctx.org.id, async (tx) => {
    const [row] = await tx.execute<{ id: string; file_id: string }>(
      sql`
        UPDATE media
        SET deleted_at = now()
        WHERE id = ${mediaId}
          AND organization_id = ${ctx.org.id}
          AND deleted_at IS NULL
        RETURNING id, file_id
      `,
    );
    if (!row) return null;

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: "media.delete",
      targetType: "media",
      targetId: row.id,
      targetLabel: row.file_id,
    });

    return row;
  });

  if (!deleted) {
    return { error: "Media not found" };
  }

  revalidatePath("/dashboard/cms");
  return { success: "Media deleted" };
}
