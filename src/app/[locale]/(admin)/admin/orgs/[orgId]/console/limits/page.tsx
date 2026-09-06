import { notFound } from "next/navigation";

import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgLimitsData } from "@/features/admin/org-console/data";
import { LimitsOverrideForm } from "@/features/admin/components/console/limits-override-form";

/**
 * Org-console limits tab (apex-dashboard-plan 4.2 limits — Diff view).
 *
 * Per key: effective limit (override → group → plan → fail-closed), plan
 * default, the group-tier value, live usage, and the source of the effective
 * value. Overrides are edited through the shared plans-data actions (console
 * wrappers revalidate this path).
 */
export default async function OrgConsoleLimitsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/limits`);

  const rows = await getOrgLimitsData(orgId);
  if (!rows) notFound();

  const overrides = rows
    .filter((row) => row.overrideValue !== null)
    .map((row) => ({ key: row.key, value: row.overrideValue }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Limits diff</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>{row.effective === null ? "unlimited" : row.effective}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.planValue === null ? "—" : row.planValue}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.hasGroupOverride
                      ? row.groupOverrideValue === null
                        ? "unlimited"
                        : row.groupOverrideValue
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.usage}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.source === "override"
                          ? "success"
                          : row.source === "group"
                            ? "default"
                            : row.source === "plan"
                              ? "outline"
                              : "warning"
                      }
                    >
                      {row.source}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <LimitsOverrideForm
            organizationId={orgId}
            keys={rows.map((row) => ({ key: row.key, label: row.label }))}
            overrides={overrides}
          />
        </CardContent>
      </Card>
    </div>
  );
}