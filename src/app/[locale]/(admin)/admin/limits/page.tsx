import { requireSuperAdmin } from "@/features/admin/context";

import { AdminSectionPlaceholder } from "../admin-section-placeholder";

/**
 * Limits admin (apex-dashboard-plan 2.4 placeholder). Cross-tenant limits
 * (admin_client_group_limit_value etc.) arrive as a later faza.
 */
export default async function AdminLimitsPage() {
  await requireSuperAdmin("/admin/limits");

  return (
    <AdminSectionPlaceholder
      title="Limits"
      description="Numeric limits per plan, group or organization."
      path="/admin/limits"
    />
  );
}