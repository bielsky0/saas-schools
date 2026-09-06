import { requireSuperAdmin } from "@/features/admin/context";

import { AdminSectionPlaceholder } from "../admin-section-placeholder";

/**
 * Feature flags admin (apex-dashboard-plan 2.4 placeholder). The flags engine
 * (admin_feature_flag / admin_feature_flag_value) is implemented and tested;
 * the matrix admin UI lands as a later faza on the same cross-tenant bypass.
 */
export default async function AdminFeatureFlagsPage() {
  await requireSuperAdmin("/admin/feature-flags");

  return (
    <AdminSectionPlaceholder
      title="Feature Flags"
      description="Global, group- and org-scoped feature toggles."
      path="/admin/feature-flags"
    />
  );
}