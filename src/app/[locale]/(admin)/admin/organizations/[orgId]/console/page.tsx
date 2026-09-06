import { notFound, redirect } from "next/navigation";

import { requireSuperAdmin } from "@/features/admin/context";
import { getConsoleOrg } from "@/features/admin/org-console/data";

/**
 * Legacy console URL redirect (apex-dashboard-plan decision at kickoff: route A —
 * console lives under `/admin/orgs/{orgId}/console`, with a redirect from the
 * older `/admin/organizations/{orgId}/console` so bookmarks keep working).
 */
export default async function LegacyConsoleRedirectPage({
  params,
}: {
  params: Promise<{ orgId: string; locale: string }>;
}) {
  const { orgId, locale } = await params;
  await requireSuperAdmin(`/admin/organizations/${orgId}`);

  const org = await getConsoleOrg(orgId);
  if (!org) notFound();

  redirect(`/${locale}/admin/orgs/${orgId}/console/settings`);
}