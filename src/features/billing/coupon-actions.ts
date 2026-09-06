"use server";

import { and, eq } from "drizzle-orm";

import { withSystemBypass } from "@/lib/db/system";
import { adminClientGroupMember, adminCoupon, adminCouponRedemption } from "@/lib/db/schema";
import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { servedSubdomain } from "@/features/organizations/served-org";
import { getOrgBySubdomain } from "@/features/organizations/data";
import type { FormState } from "@/lib/validation";
import type { BillingDiscount } from "@/lib/adapters/billing/contract";

/**
 * Coupon redemption engine (apex-dashboard-plan Faza 5, §5.2).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): coupon
 * definitions and redemptions live in the GLOBAL `admin_coupon` /
 * `admin_coupon_redemption` tables whose only RLS policy is the system bypass
 * (migration 0087). A TENANT org admin redeeming a code must not write another
 * tenant's rows, so the redemption insert and its existence probes run in ONE
 * bypass transaction, separate from the tenant's GUC. The module is enumerated
 * in eslint.config.mjs next to `features/admin/groups-actions.ts` for the same
 * reason.
 *
 * REGISTRATION vs DISCOUNT: a redemption is the AUTHORIZATION a coupon grants an
 * org; applying it to a checkout (in `checkout.ts`) is a separate step. There is
 * exactly one "active" redemption per org per coupon (the 0092 unique index
 * enforces it), and `discountForOrg` returns the discount for the MOST RECENT
 * active redemption — MVP scopes to the next checkout only.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** A coupon resolved as applicable for a specific org (after 0091-style checks). */
type ResolvedCoupon = {
  id: string;
  code: string;
  type: "percent" | "amount";
  value: number;
  currency: string | null;
};

/**
 * Resolve the first applicable coupon for an org's redemption, or null.
 *
 * Checks, in order: exists → not expired → org in scope (global / group /
 * organization match) → not over max activations → not already redeemed by this
 * org. The coupon lookup, scope/group reads and redemption probes are all
 * cross-tenant, so they run inside one bypass transaction.
 */
export async function resolveApplicableCoupon(
  orgId: string,
  code: string,
): Promise<{ coupon: ResolvedCoupon } | { coupon: null; reason: string }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { coupon: null, reason: "Enter a code." };

  return withSystemBypass("coupons: resolve applicable coupon", async (tx) => {
    const [coupon] = await tx
      .select()
      .from(adminCoupon)
      .where(eq(adminCoupon.code, normalized))
      .limit(1);
    if (!coupon) return { coupon: null, reason: "Invalid code." };

    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return { coupon: null, reason: "This code has expired." };
    }

    // Scope: 'global' applies to everyone; 'organization' matches one org; a
    // 'group'-scoped code applies when the org belongs to that group.
    if (coupon.scope === "organization" && coupon.scopeId !== orgId) {
      return { coupon: null, reason: "This code is not valid for your organization." };
    }
    if (coupon.scope === "group") {
      const orgGroupIds = (
        await tx
          .select({ groupId: adminClientGroupMember.groupId })
          .from(adminClientGroupMember)
          .where(eq(adminClientGroupMember.organizationId, orgId))
      ).map((r) => r.groupId);
      if (!coupon.scopeId || !orgGroupIds.includes(coupon.scopeId)) {
        return { coupon: null, reason: "This code is not valid for your organization." };
      }
    }

    if (coupon.maxActivations !== null) {
      const rows = await tx
        .select({ id: adminCouponRedemption.id })
        .from(adminCouponRedemption)
        .where(eq(adminCouponRedemption.couponId, coupon.id));
      if (rows.length >= coupon.maxActivations) {
        return { coupon: null, reason: "This code has reached its redemption limit." };
      }
    }

    const already = await tx
      .select({ id: adminCouponRedemption.id })
      .from(adminCouponRedemption)
      .where(
        and(
          eq(adminCouponRedemption.couponId, coupon.id),
          eq(adminCouponRedemption.organizationId, orgId),
        ),
      )
      .limit(1);
    if (already) return { coupon: null, reason: "Your organization already used this code." };

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type as "percent" | "amount",
        value: coupon.value,
        currency: coupon.currency,
      },
    };
  });
}

/**
 * Redeem a coupon for the CURRENT organization (server action called from the
 * org's billing page). Writes the redemption journal (bypass-only) and audits
 * `coupon.redemption.create`.
 */
export async function applyCouponAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState & { discount?: BillingDiscount }> {
  const subdomain = await servedSubdomain();
  if (!subdomain) return { error: "Not available for personal accounts." };

  const ctx = await requireOrgPermission("billing.manage");
  const org = await getOrgBySubdomain(subdomain);
  if (!org) return { error: "Organization not found." };

  const code = String(formData.get("code") ?? "").trim();

  const resolved = await resolveApplicableCoupon(org.id, code);
  if (!resolved.coupon) return { error: resolved.reason || GENERIC_ERROR };
  const { coupon } = resolved;

  try {
    const discount: BillingDiscount =
      coupon.type === "percent"
        ? { type: "percent", value: coupon.value, code: coupon.code }
        : { type: "amount", value: coupon.value, currency: coupon.currency ?? undefined, code: coupon.code };

    await withSystemBypass("coupons: redeem for org", async (tx) => {
      const [row] = await tx
        .insert(adminCouponRedemption)
        .values({
          id: crypto.randomUUID(),
          couponId: coupon.id,
          organizationId: org.id,
          activatedByUserId: ctx.session.user.id,
        })
        .returning({ id: adminCouponRedemption.id });
      if (!row) throw new Error("coupon redemption insert did not return a row");

      await recordAudit(tx, {
        action: "coupon.redemption.create",
        actor: await resolveActor(ctx.session),
        organizationId: org.id,
        targetType: "coupon_redemption",
        targetId: row.id,
        targetLabel: `${coupon.code} → ${org.name}`,
        metadata: { couponId: coupon.id, code: coupon.code, orgId: org.id },
      });
    });

    return {
      success: `Coupon "${coupon.code}" applied to your next checkout.`,
      discount,
    };
  } catch {
    // A 23505 here means a racing double-redeem — re-run the check already done.
    return { error: GENERIC_ERROR };
  }
}

/**
 * The discount to apply to an org's next checkout: the most recent ACTIVE
 * redemption. Returns null when the org has no usable coupon.
 */
export async function discountForOrg(orgId: string): Promise<BillingDiscount | null> {
  return withSystemBypass("coupons: discount for org", async (tx) => {
    const rows = await tx
      .select({
        id: adminCouponRedemption.id,
        couponId: adminCouponRedemption.couponId,
        type: adminCoupon.type,
        value: adminCoupon.value,
        currency: adminCoupon.currency,
        code: adminCoupon.code,
        expiresAt: adminCoupon.expiresAt,
      })
      .from(adminCouponRedemption)
      .innerJoin(adminCoupon, eq(adminCoupon.id, adminCouponRedemption.couponId))
      .where(eq(adminCouponRedemption.organizationId, orgId))
      .orderBy(adminCouponRedemption.activatedAt);

    // The most recent non-expired redemption is "the active one" for MVP.
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (!r) continue;
      if (r.expiresAt && r.expiresAt.getTime() < Date.now()) continue;
      return r.type === "percent"
        ? { type: "percent" as const, value: r.value, code: r.code }
        : { type: "amount" as const, value: r.value, currency: r.currency ?? undefined, code: r.code };
    }
    return null;
  });
}
