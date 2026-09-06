import { notFound } from "next/navigation";

import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getCoupon } from "@/features/admin/coupons";

/**
 * Coupon detail (apex-dashboard-plan Faza 5, §5.2). Shows one coupon and its
 * per-organization redemptions. Revocation (`coupon.redemption.remove`) is
 * exposed operationally via the org console; this read-only page is the place
 * an auditor/investigator checks who used a code.
 */
export default async function AdminCouponDetailPage({
  params,
}: {
  params: Promise<{ couponId: string }>;
}) {
  const { couponId } = await params;
  await requireSuperAdmin(`/admin/coupons/${couponId}`);

  // Library path name clash: parameter is the route segment; value may be the id
  // or (for seed/legacy links) the code — resolve by trying id then code.
  const data = await getCoupon(couponId);
  if (!data.coupon) notFound();
  const { coupon, redemptions } = data;

  const expired = coupon.expired;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold">{coupon.code}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {coupon.type === "percent"
            ? `${coupon.value}% off`
            : `${coupon.value} ${coupon.currency?.toUpperCase() ?? ""} off`}{" "}
          · scope {coupon.scope}
          {coupon.scope !== "global" ? ` · ${coupon.scopeId}` : ""}
          {coupon.expiresAt ? (
            <>
              {" "}
              · expires{" "}
              <Badge variant={expired ? "destructive" : "outline"}>
                {coupon.expiresAt.toLocaleDateString()}
              </Badge>
            </>
          ) : null}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redemptions ({redemptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No organization has redeemed this coupon.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Activated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.orgName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.activatedAt.toLocaleString()}
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