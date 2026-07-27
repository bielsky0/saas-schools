import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { listAllOrganizations } from "@/features/admin/data";
import { getCustomBlockKeys } from "@/features/cms/block-registry";
import { listAllGrants } from "@/features/cms/tenant-block-access";
import { orgListQuerySchema } from "@/features/admin/schema";

import { GrantToggle } from "./grant-toggle";

/**
 * Super Admin panel — grant/revoke custom CMS blocks per organization.
 */
export default async function AdminCmsBlocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperAdmin("/admin/cms-blocks");

  const query = orgListQuerySchema.parse(await searchParams);
  const { rows: orgs } = await listAllOrganizations({ ...query, page: 0 });

  const customBlockKeys = getCustomBlockKeys();
  const allGrants = await listAllGrants();

  const grantsByOrg = new Map<string, Set<string>>();
  for (const g of allGrants) {
    const set = grantsByOrg.get(g.organizationId) ?? new Set();
    set.add(g.blockKey);
    grantsByOrg.set(g.organizationId, set);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CMS Blocks</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Grant or revoke custom CMS blocks per organization. Core blocks are always available.
        </p>
      </div>

      {customBlockKeys.length === 0 ? (
        <p className="text-muted-foreground text-sm">No custom blocks are registered yet.</p>
      ) : orgs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No organizations found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              {customBlockKeys.map((key) => (
                <TableHead key={key} className="text-center capitalize">
                  {key.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => {
              const granted = grantsByOrg.get(org.id) ?? new Set();
              return (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-muted-foreground text-xs">/{org.slug}</div>
                  </TableCell>
                  {customBlockKeys.map((key) => {
                    const isGranted = granted.has(key);
                    return (
                      <TableCell key={key} className="text-center">
                        <GrantToggle orgId={org.id} blockKey={key} granted={isGranted} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
