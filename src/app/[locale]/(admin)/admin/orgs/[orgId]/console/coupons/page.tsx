import { notFound } from "next/navigation";

import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgCouponsData } from "@/features/admin/coupons";
import { getConsoleOrg } from "@/features/admin/org-console/data";

/**
 * Org-console "Rabaty" tab (apex-dashboard-plan Faza 5, §5.2 — active discounts
 * on the client account). Lists the org's coupon redemptions with their value;
 * the actual discount is applied on the org's public billing checkout
 * (`billing/coupon-actions.discountForOrg`).
 */
export default async function OrgConsoleCouponsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/coupons`);

  const [org, redemptions] = await Promise.all([getConsoleOrg(orgId), getOrgCouponsData(orgId)]);
  if (!org) notFound();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aktywne rabaty</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {org.name} hasn&apos;t redeemed any coupon yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Activated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.couponCode}</TableCell>
                    <TableCell>
                      {r.couponType === "percent" ? (
                        <Badge variant="success">{r.couponValue}%</Badge>
                      ) : (
                        `${r.couponValue} ${r.couponCurrency?.toUpperCase() ?? ""}`
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.activatedAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}