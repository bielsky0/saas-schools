import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgGroupsData } from "@/features/admin/org-console/data";

/**
 * Org-console groups tab (apex-dashboard-plan 4.2 groups).
 *
 * Read view of the TARGET org's OWN group types — tenant-scoped GROUP TYPES,
 * NOT the cross-tenant `admin_client_group`. Full CRUD stays inside the
 * academy's own dashboard (`/dashboard/group-types`); the console shows the
 * offer catalog and marks it as internal.
 */
export default async function OrgConsoleGroupsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/groups`);

  const groupTypes = await getOrgGroupsData(orgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer catalog (internal group types)</CardTitle>
      </CardHeader>
      <CardContent>
        {groupTypes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This organization has no group types yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupTypes.map((groupType) => (
                <TableRow key={groupType.id}>
                  <TableCell className="font-medium">{groupType.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      {groupType.slug}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{groupType.engine}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{groupType.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {(groupType.price / 100).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}