"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/features/admin/audit";
import { requireSuperAdmin } from "@/features/admin/context";
import { issueCredits } from "@/features/credits/issue";
import { creditType, client, organization } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";

/**
 * Org-console credits actions (apex-dashboard-plan 4.2 credits).
 *
 * Super-admin variant of the org feature's `grantCreditsAction`: same
 * `issueCredits` mechanism, same `credit.grant` audit action — but the acting
 * principal is the apex super admin and the target org comes from the URL. The
 * write is tenant-scoped (`withTenant(orgId)`); `requireSuperAdmin()` first.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function grantOrgCreditsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const organizationId = str(formData.get("organizationId"));
  const clientId = str(formData.get("clientId"));
  const creditTypeId = str(formData.get("creditTypeId"));
  const rawQuantity = str(formData.get("quantity"));
  const reason = str(formData.get("reason")).trim();

  const quantity = Number(rawQuantity);
  if (!organizationId) return { error: "Missing organization." };
  if (!clientId) return { error: "Client is required." };
  if (!creditTypeId) return { error: "Credit type is required." };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "Quantity must be a positive integer." };
  if (!reason) return { error: "A reason is required." };

  try {
    await withTenant(organizationId, async (tx) => {
      const [type] = await tx
        .select({
          id: creditType.id,
          name: creditType.name,
          organizationId: creditType.organizationId,
        })
        .from(creditType)
        .where(and(eq(creditType.id, creditTypeId), eq(creditType.organizationId, organizationId)))
        .limit(1);
      if (!type) throw Object.assign(new Error("credit type"), { code: "NOT_FOUND" });

      const [parent] = await tx
        .select({ id: client.id, email: client.email })
        .from(client)
        .where(and(eq(client.id, clientId), eq(client.organizationId, organizationId)))
        .limit(1);
      if (!parent) throw Object.assign(new Error("client"), { code: "NOT_FOUND" });

      // Organization timezone for validity — the org's own zone, never the server's.
      const [org] = await tx
        .select({ timezone: organization.timezone })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      const issued = await issueCredits(tx, {
        organizationId: organizationId,
        clientId: parent.id,
        creditTypeId: type.id,
        quantity,
        source: "manual_admin_grant",
        timeZone: org?.timezone ?? "UTC",
        grantedByUserId: ctx.actorId,
        reason,
      });

      await recordAudit(tx, {
        action: "credit.grant",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "client",
        targetId: parent.id,
        targetLabel: parent.email,
        metadata: {
          creditTypeId: type.id,
          creditTypeName: type.name,
          quantity,
          reason,
          validUntil: issued[0]?.validUntil.toISOString() ?? null,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && (err as { code?: string }).code === "NOT_FOUND") {
      return { error: "Client or credit type not found in this organization." };
    }
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/admin/orgs/${organizationId}/console/credits`);
  return { success: "Credits granted." };
}