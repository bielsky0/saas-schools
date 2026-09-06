import { notFound } from "next/navigation";

import BuilderEditorLoader from "@/features/cms/builder-editor-loader";
import { requireSuperAdmin } from "@/features/admin/context";
import { getConsoleOrg } from "@/features/admin/org-console/data";

/**
 * Org-console builder (apex-dashboard-plan 4.3) — `/admin/orgs/[orgId]/builder`.
 *
 * SPIKE: renders the same `ChaiWebsiteBuilder` as `{subdomain}/editor` inside
 * the `(admin)` shell, pointed at the apex admin-editor API route
 * (`/admin-editor/api/{orgId}`), which runs the shared builder core with
 * `requireSuperAdmin`-style auth + Rule A audit on every write. The spike
 * verifies the heavy client SDK survives the shell's constrained layout; if it
 * does not, the fallback is a dedicated full-width route outside `(admin)`
 * carrying its own guard.
 */
export default async function OrgConsoleBuilderPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/builder`);

  const org = await getConsoleOrg(orgId);
  if (!org) notFound();

  return <BuilderEditorLoader apiUrl={`/admin-editor/api/${orgId}`} />;
}