"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/features/admin/context";
import { recordAudit, resolveActor } from "@/features/admin/audit";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation/state";

import { grantBlock, revokeBlock } from "./tenant-block-access";
import { getCustomBlockKeys } from "./block-registry";

export async function grantBlockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const orgId = formData.get("orgId");
  const blockKey = formData.get("blockKey");

  if (typeof orgId !== "string" || !orgId) {
    return { error: "Organization ID is required" };
  }
  if (typeof blockKey !== "string" || !blockKey) {
    return { error: "Block key is required" };
  }

  if (!getCustomBlockKeys().includes(blockKey)) {
    return { error: `Unknown custom block: ${blockKey}` };
  }

  const actor = await resolveActor(ctx.session);

  await withTenant(orgId, async (tx) => {
    await grantBlock(tx, {
      organizationId: orgId,
      blockKey,
      grantedByUserId: ctx.actorId,
    });

    await recordAudit(tx, {
      actor,
      organizationId: orgId,
      action: "block.grant",
      targetType: "tenant_block_access",
      targetId: `${orgId}:${blockKey}`,
      targetLabel: blockKey,
      metadata: { granteeOrgId: orgId },
    });
  });

  revalidatePath("/admin/cms-blocks");
  return { success: `Block "${blockKey}" granted` };
}

export async function revokeBlockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const orgId = formData.get("orgId");
  const blockKey = formData.get("blockKey");

  if (typeof orgId !== "string" || !orgId) {
    return { error: "Organization ID is required" };
  }
  if (typeof blockKey !== "string" || !blockKey) {
    return { error: "Block key is required" };
  }

  const actor = await resolveActor(ctx.session);

  const removed = await withTenant(orgId, async (tx) => {
    const ok = await revokeBlock(tx, orgId, blockKey);

    if (ok) {
      await recordAudit(tx, {
        actor,
        organizationId: orgId,
        action: "block.revoke",
        targetType: "tenant_block_access",
        targetId: `${orgId}:${blockKey}`,
        targetLabel: blockKey,
        metadata: { granteeOrgId: orgId },
      });
    }

    return ok;
  });

  if (!removed) {
    return { error: "Grant not found" };
  }

  revalidatePath("/admin/cms-blocks");
  return { success: `Block "${blockKey}" revoked` };
}
