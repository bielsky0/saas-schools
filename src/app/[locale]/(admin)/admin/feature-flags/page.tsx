import { requireSuperAdmin } from "@/features/admin/context";
import { listOrgSelectOptions } from "@/features/admin/data";
import { getEffectiveFlagMatrix } from "@/features/admin/flags";
import { listGroups } from "@/features/admin/groups";

import { FeatureFlagsClient } from "./feature-flags-client";

/**
 * Feature-flag matrix (apex-dashboard-plan Faza 3). The heart of the flags
 * surface: one row per flag, columns for Global / every client group / a
 * selected client. The columns are all cross-tenant reads that only make sense
 * behind `requireSuperAdmin` (§0.10).
 *
 * `?org=` in the URL is the org selector state — "the URL is state", exactly
 * like the list filters on /admin/organizations. The selected org drives the
 * Klient column (org override + condition indicator), and the combobox changes
 * the URL rather than holding local state.
 */
export default async function AdminFeatureFlagsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperAdmin("/admin/feature-flags");

  const params = await searchParams;
  const requested = typeof params.org === "string" ? params.org : null;

  const orgOptions = await listOrgSelectOptions();
  // Tolerate a garbage / stale ?org= — fall back to no org selected.
  const selectedOrgId = requested && orgOptions.some((o) => o.id === requested) ? requested : null;

  const [matrix, groups] = await Promise.all([
    getEffectiveFlagMatrix(selectedOrgId ?? undefined),
    listGroups(),
  ]);

  return (
    <FeatureFlagsClient
      matrix={matrix}
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      orgOptions={orgOptions}
      selectedOrgId={selectedOrgId}
    />
  );
}