import { count, eq } from "drizzle-orm";

import { withSystemBypass } from "@/lib/db/system";
import { adminCoupon, adminCouponRedemption, organization } from "@/lib/db/schema";

/**
 * Cross-tenant coupons data layer (apex-dashboard-plan Faza 5, §5.2).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every read
 * here crosses tenants. `admin_coupon` / `admin_coupon_redemption` are GLOBAL
 * tables whose only RLS policy is the system bypass (migration 0087) — a tenant
 * session must not see another org's coupon definitions, so these reads cannot
 * run under a tenant GUC. The module is enumerated in eslint.config.mjs next to
 * `features/admin/groups.ts` for the same reason.
 *
 * All exported functions are reachable only behind `requireSuperAdmin()` —
 * pages call it as their first line, actions pass it directly.
 */

/** One coupon row with its redemption count. */
export type AdminCouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  currency: string | null;
  expiresAt: Date | null;
  maxActivations: number | null;
  scope: string;
  scopeId: string | null;
  createdByUserId: string;
  createdAt: Date;
  redemptionCount: number;
  /** Whether the coupon has passed its expiry, computed server-side. */
  expired: boolean;
};

/** One redemption row joined with the org's name. */
export type AdminCouponRedemptionRow = {
  id: string;
  couponId: string;
  organizationId: string;
  orgName: string;
  activatedAt: Date;
  activatedByUserId: string | null;
};

/** All coupons with redemption counts (apex-dashboard-plan Faza 5, §5.2). */
export async function listCoupons(): Promise<AdminCouponRow[]> {
  const rows = await withSystemBypass("super admin: coupons list", (tx) =>
    tx
      .select({
        id: adminCoupon.id,
        code: adminCoupon.code,
        type: adminCoupon.type,
        value: adminCoupon.value,
        currency: adminCoupon.currency,
        expiresAt: adminCoupon.expiresAt,
        maxActivations: adminCoupon.maxActivations,
        scope: adminCoupon.scope,
        scopeId: adminCoupon.scopeId,
        createdByUserId: adminCoupon.createdByUserId,
        createdAt: adminCoupon.createdAt,
        redemptionCount: count(adminCouponRedemption.id),
      })
      .from(adminCoupon)
      .leftJoin(adminCouponRedemption, eq(adminCouponRedemption.couponId, adminCoupon.id))
      .groupBy(adminCoupon.id)
      .orderBy(adminCoupon.code),
  );
  return rows.map(withExpiredFlag);
}

/** Attach the server-side expiry flag (a component must not call Date.now). */
function withExpiredFlag<T extends { expiresAt: Date | null }>(row: T): T & { expired: boolean } {
  return { ...row, expired: row.expiresAt ? row.expiresAt.getTime() < Date.now() : false };
}

/** One coupon with its redemptions (apex-dashboard-plan Faza 5, §5.2). */
export async function getCoupon(couponId: string): Promise<{
  coupon: AdminCouponRow | null;
  redemptions: AdminCouponRedemptionRow[];
}> {
  return withSystemBypass("super admin: coupon detail", async (tx) => {
    const [row] = await tx
      .select({
        id: adminCoupon.id,
        code: adminCoupon.code,
        type: adminCoupon.type,
        value: adminCoupon.value,
        currency: adminCoupon.currency,
        expiresAt: adminCoupon.expiresAt,
        maxActivations: adminCoupon.maxActivations,
        scope: adminCoupon.scope,
        scopeId: adminCoupon.scopeId,
        createdByUserId: adminCoupon.createdByUserId,
        createdAt: adminCoupon.createdAt,
        redemptionCount: count(adminCouponRedemption.id),
      })
      .from(adminCoupon)
      .leftJoin(adminCouponRedemption, eq(adminCouponRedemption.couponId, adminCoupon.id))
      .where(eq(adminCoupon.id, couponId))
      .groupBy(adminCoupon.id)
      .limit(1);

    if (!row) return { coupon: null, redemptions: [] };

    const redemptions = await tx
      .select({
        id: adminCouponRedemption.id,
        couponId: adminCouponRedemption.couponId,
        organizationId: adminCouponRedemption.organizationId,
        orgName: organization.name,
        activatedAt: adminCouponRedemption.activatedAt,
        activatedByUserId: adminCouponRedemption.activatedByUserId,
      })
      .from(adminCouponRedemption)
      .innerJoin(organization, eq(organization.id, adminCouponRedemption.organizationId))
      .where(eq(adminCouponRedemption.couponId, couponId))
      .orderBy(adminCouponRedemption.activatedAt);

    return { coupon: withExpiredFlag(row), redemptions };
  });
}

/** Redemptions for one coupon (admin detail page). */
export async function listCouponRedemptions(
  couponId: string,
): Promise<AdminCouponRedemptionRow[]> {
  return withSystemBypass("super admin: coupon redemptions", (tx) =>
    tx
      .select({
        id: adminCouponRedemption.id,
        couponId: adminCouponRedemption.couponId,
        organizationId: adminCouponRedemption.organizationId,
        orgName: organization.name,
        activatedAt: adminCouponRedemption.activatedAt,
        activatedByUserId: adminCouponRedemption.activatedByUserId,
      })
      .from(adminCouponRedemption)
      .innerJoin(organization, eq(organization.id, adminCouponRedemption.organizationId))
      .where(eq(adminCouponRedemption.couponId, couponId))
      .orderBy(adminCouponRedemption.activatedAt),
  );
}

/** Active redemptions for one org (org console "Rabaty" tab). */
export type OrgCouponRedemptionRow = {
  id: string;
  couponId: string;
  couponCode: string;
  couponType: string;
  couponValue: number;
  couponCurrency: string | null;
  activatedAt: Date;
};

export async function getOrgCouponsData(
  orgId: string,
): Promise<OrgCouponRedemptionRow[]> {
  return withSystemBypass("super admin: org coupons data", (tx) =>
    tx
      .select({
        id: adminCouponRedemption.id,
        couponId: adminCouponRedemption.couponId,
        couponCode: adminCoupon.code,
        couponType: adminCoupon.type,
        couponValue: adminCoupon.value,
        couponCurrency: adminCoupon.currency,
        activatedAt: adminCouponRedemption.activatedAt,
      })
      .from(adminCouponRedemption)
      .innerJoin(adminCoupon, eq(adminCoupon.id, adminCouponRedemption.couponId))
      .where(eq(adminCouponRedemption.organizationId, orgId))
      .orderBy(adminCouponRedemption.activatedAt),
  );
}
