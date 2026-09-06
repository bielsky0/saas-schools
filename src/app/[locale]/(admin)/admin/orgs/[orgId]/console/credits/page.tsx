import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgCreditsData } from "@/features/admin/org-console/data";
import { CreditsGrantForm } from "@/features/admin/components/console/credits-grant-form";

/**
 * Org-console credits tab (apex-dashboard-plan 4.2 credits).
 *
 * Manual grant into a family wallet (client) within the target org — same
 * `issueCredits` mechanism and `credit.grant` audit as the org feature's grant,
 * with the super admin as the acting principal.
 */
export default async function OrgConsoleCreditsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/credits`);

  const data = await getOrgCreditsData(orgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grant credits</CardTitle>
      </CardHeader>
      <CardContent>
        <CreditsGrantForm
          organizationId={orgId}
          creditTypes={data.creditTypes}
          clients={data.clients}
        />
      </CardContent>
    </Card>
  );
}