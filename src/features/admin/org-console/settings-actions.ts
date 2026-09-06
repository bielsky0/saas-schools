"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { isPgUniqueViolation } from "@/lib/db/errors";
import { recordAudit } from "@/features/admin/audit";
import { requireSuperAdmin } from "@/features/admin/context";
import type { FormState } from "@/lib/validation";
import { orgSettingsSchema } from "./schema";

/**
 * Org-console settings actions (apex-dashboard-plan 4.2 settings).
 *
 * These edit the TARGET organization's own columns — name, timezone, currency,
 * schedule bounds, subdomain, plan. The `organization` table carries no RLS
 * policy (it is the owner target itself, see schema/index.ts header), so writes
 * go through the plain `db` like `deleteOrganizationAction` does — NOT through
 * `withTenant`/`withSystemBypass`. The audit row shares the transaction.
 *
 * Diff-shaped overrides (admin_client_setting_override) are a separate concern
 * (risk #5: "Diff dotyczy tylko override'ów") — they are managed by the
 * settings page's override section, not written here.
 * Every mutation: `requireSuperAdmin()` FIRST → write → `recordAudit` (Rule A)
 * in the same transaction → `revalidatePath` after commit.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NOT_FOUND = Object.assign(new Error("org not found"), { code: "NOT_FOUND" });

export async function updateOrgSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const parsed = orgSettingsSchema.safeParse({
    organizationId: str(formData.get("organizationId")),
    name: str(formData.get("name")),
    timezone: str(formData.get("timezone")),
    currency: str(formData.get("currency")),
    scheduleStartHour: str(formData.get("scheduleStartHour")),
    scheduleEndHour: str(formData.get("scheduleEndHour")),
    scheduleSlotMinutes: str(formData.get("scheduleSlotMinutes")),
    subdomain: str(formData.get("subdomain")),
    planId: str(formData.get("planId")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  const { organizationId, ...values } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select({
          name: organization.name,
          timezone: organization.timezone,
          currency: organization.currency,
          scheduleStartHour: organization.scheduleStartHour,
          scheduleEndHour: organization.scheduleEndHour,
          scheduleSlotMinutes: organization.scheduleSlotMinutes,
          subdomain: organization.subdomain,
          planId: organization.planId,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
      if (!before) throw NOT_FOUND;

      await tx
        .update(organization)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(organization.id, organizationId));

      await recordAudit(tx, {
        action: "organization.update",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "organization",
        targetId: organizationId,
        targetLabel: before.subdomain,
        metadata: { from: before, to: values },
      });
    });

    revalidatePath(`/admin/orgs/${organizationId}/console/settings`);
    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: "Settings saved." };
  } catch (err) {
    if (isPgUniqueViolation(err)) return { error: "Subdomain is already taken." };
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "NOT_FOUND") {
      return { error: "Organization not found." };
    }
    return { error: GENERIC_ERROR };
  }
}