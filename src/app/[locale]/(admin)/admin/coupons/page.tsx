import { requireSuperAdmin } from "@/features/admin/context";

import { AdminSectionPlaceholder } from "../admin-section-placeholder";

/**
 * Coupons admin (apex-dashboard-plan 2.4 placeholder). Backed by admin_coupon —
 * the model is still a planning shape until the checkout integration.
 */
export default async function AdminCouponsPage() {
  await requireSuperAdmin("/admin/coupons");

  return (
    <AdminSectionPlaceholder
      title="Coupons"
      description="Discounts scoped global, group- or org-wide."
      path="/admin/coupons"
    />
  );
}