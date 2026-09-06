import { requireSuperAdmin } from "@/features/admin/context";
import { listCoupons } from "@/features/admin/coupons";

import { CouponsClient } from "./coupons-client";

/**
 * Coupons admin (apex-dashboard-plan Faza 5, §5.2). Lists every coupon with its
 * redemption count and scope. Coupons are GLOBAL definitions (bypass-only
 * tables) readable only behind `requireSuperAdmin`.
 */
export default async function AdminCouponsPage() {
  await requireSuperAdmin("/admin/coupons");

  const coupons = await listCoupons();

  return (
    <div className="space-y-6">
      <CouponsClient coupons={coupons} />
    </div>
  );
}