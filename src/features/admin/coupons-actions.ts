"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withSystemBypass } from "@/lib/db/system";
import { adminCoupon, adminCouponRedemption, organization } from "@/lib/db/schema";
import type { FormState } from "@/lib/validation";
import { recordAudit } from "./audit";
import { requireSuperAdmin } from "./context";

/**
 * Coupon admin server actions (apex-dashboard-plan Faza 5, §5.2).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every write
 * here targets the GLOBAL tables `admin_coupon` / `admin_coupon_redemption`
 * whose only RLS policy is the system bypass (migration 0087). The module is
 * enumerated in eslint.config.mjs next to `groups-actions.ts` for the same
 * reason.
 *
 * INVARIANT (same as groups-actions.ts / flags-actions.ts / plans-data.ts):
 *   1. `requireSuperAdmin()` as the FIRST line
 *   2. Write in `withSystemBypass` (GLOBAL tables, no tenant GUC)
 *   3. `recordAudit(tx, ...)` inside the SAME transaction (Rule A)
 *   4. `revalidatePath` after commit
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";

function str(value: FormDataEntryValue | null): string {
  return (typeof value === "string" ? value : "").trim();
}

function isConflict(err: unknown): boolean {
  return (
    ((err as { code?: string })?.code === "23505") || // unique_violation (code column)
    ((err as { code?: string })?.code === "CONFLICT")
  );
}

/** Create a coupon from a form (admin list page). */
export async function createCouponAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const code = str(formData.get("code")).toUpperCase();
  const type = str(formData.get("type"));
  const rawValue = str(formData.get("value"));
  const currency = str(formData.get("currency")) || null;
  const rawExpires = str(formData.get("expiresAt")) || null;
  const rawMax = str(formData.get("maxActivations")) || null;
  const scope = str(formData.get("scope"));
  const scopeId = str(formData.get("scopeId")) || null;

  if (!code || !type) return { error: "Code and type are required." };
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    return { error: "Value must be a positive whole number." };
  }
  if (type === "percent" && (value > 100 || currency)) {
    return { error: "Percent coupons have no currency and a value ≤ 100." };
  }
  if (type === "amount" && !currency) {
    return { error: "Amount coupons require a currency." };
  }
  if (!["global", "group", "organization"].includes(scope)) {
    return { error: "Invalid scope." };
  }
  if (scope !== "global" && !scopeId) {
    return { error: "Scope requires a target id." };
  }

  const maxActivations = rawMax === "" ? null : Number(rawMax);
  if (maxActivations !== null && (!Number.isInteger(maxActivations) || maxActivations < 1)) {
    return { error: "Max activations must be a positive whole number or empty." };
  }
  const expiresAt = rawExpires ? new Date(rawExpires) : null;
  if (rawExpires && Number.isNaN(expiresAt!.getTime())) {
    return { error: "Invalid expiry date." };
  }

  try {
    await withSystemBypass("super admin: create coupon", async (tx) => {
      const [row] = await tx
        .insert(adminCoupon)
        .values({
          id: crypto.randomUUID(),
          code,
          type,
          value,
          currency,
          expiresAt,
          maxActivations,
          scope,
          scopeId,
          createdByUserId: ctx.actorId,
        })
        .returning({ id: adminCoupon.id, code: adminCoupon.code });

      if (!row) throw new Error("no row returned");

      await recordAudit(tx, {
        action: "coupon.create",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "coupon",
        targetId: row.id,
        targetLabel: row.code,
        metadata: { code, type, value, currency, expiresAt, maxActivations, scope, scopeId },
      });
    });

    revalidatePath("/admin/coupons");
    return { success: `Coupon "${code}" created.` };
  } catch (err) {
    if (isConflict(err)) return { error: "That code already exists." };
    return { error: GENERIC_ERROR };
  }
}

/** Delete a coupon (cascades to redemptions). */
export async function deleteCouponAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const id = str(formData.get("couponId"));
  if (!id) return { error: "Coupon id is required." };

  try {
    await withSystemBypass("super admin: delete coupon", async (tx) => {
      const [existing] = await tx
        .select({ code: adminCoupon.code })
        .from(adminCoupon)
        .where(eq(adminCoupon.id, id))
        .limit(1);
      if (!existing) return;

      await tx.delete(adminCoupon).where(eq(adminCoupon.id, id));

      await recordAudit(tx, {
        action: "coupon.delete",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "coupon",
        targetId: id,
        targetLabel: existing.code,
        metadata: { code: existing.code },
      });
    });

    revalidatePath("/admin/coupons");
    return { success: "Coupon deleted." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

/**
 * Remove one redemption (revoke). Audited as `coupon.redemption.remove` with the
 * coupon-org composite target (same precedent as client_group_member.remove).
 */
export async function removeRedemptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const redemptionId = str(formData.get("redemptionId"));
  if (!redemptionId) return { error: "Redemption id is required." };

  try {
    await withSystemBypass("super admin: remove redemption", async (tx) => {
      const [existing] = await tx
        .select({
          id: adminCouponRedemption.id,
          couponId: adminCouponRedemption.couponId,
          organizationId: adminCouponRedemption.organizationId,
          couponCode: adminCoupon.code,
          orgName: organization.name,
        })
        .from(adminCouponRedemption)
        .innerJoin(adminCoupon, eq(adminCoupon.id, adminCouponRedemption.couponId))
        .innerJoin(organization, eq(organization.id, adminCouponRedemption.organizationId))
        .where(eq(adminCouponRedemption.id, redemptionId))
        .limit(1);
      if (!existing) return; // idempotent

      await tx.delete(adminCouponRedemption).where(eq(adminCouponRedemption.id, redemptionId));

      await recordAudit(tx, {
        action: "coupon.redemption.remove",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: existing.organizationId,
        targetType: "coupon_redemption",
        targetId: existing.id,
        targetLabel: `${existing.couponCode} → ${existing.orgName}`,
        metadata: { couponId: existing.couponId, orgId: existing.organizationId },
      });
    });

    revalidatePath("/admin/coupons");
    return { success: "Redemption removed." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}
