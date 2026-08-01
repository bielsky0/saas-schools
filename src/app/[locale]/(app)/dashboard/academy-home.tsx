import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui";
import { requireOrgAccess } from "@/features/organizations/context";
import { AdminDashboardCards } from "@/components/dashboard/admin-cards";
import { ReceptionCards } from "@/components/dashboard/reception-cards";
import TrainerDashboard from "./trainer-dashboard";

/**
 * Academy panel home (Faza 07, §7a).
 *
 * The dashboard is one path rendering per-role card sets. The role split:
 *
 *   - trainer        → `TrainerDashboard` (own sessions, greeting)
 *   - reception       → `ReceptionCards`  (front desk: today's classes, quick actions)
 *   - secretariat     → `ReceptionCards`  (same surface — both are desk roles here)
 *   - owner/admin     → `AdminDashboardCards` (management overview)
 *   - member          → `AdminDashboardCards`, gated by effectivePermissions
 *
 * Each card set streams its cards independently (Suspense + skeleton per card),
 * so one slow query never holds the whole home.
 */
export default async function AcademyHome() {
  const { org, role, effectivePermissions } = await requireOrgAccess();

  if (role === "trainer") {
    return <TrainerDashboard />;
  }
  const t = await getTranslations("dashboard.org");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          {t("yourRole")} <Badge variant="outline">{role}</Badge>
        </p>
      </div>

      {role === "reception" || role === "secretariat" ? (
        <ReceptionCards orgId={org.id} permissions={effectivePermissions} />
      ) : (
        <AdminDashboardCards orgId={org.id} permissions={effectivePermissions} />
      )}
    </div>
  );
}
