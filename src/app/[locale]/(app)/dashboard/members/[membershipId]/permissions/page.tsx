import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Badge, Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { membership } from "@/lib/db/schema";
import { requireOrgPermission } from "@/features/organizations/context";
import { listPermissionOverrides } from "@/features/organizations/data";
import { withTenant } from "@/lib/db/tenant";
import { PermissionOverrideForm } from "./override-form";
import { DeleteOverrideButton } from "./delete-override-button";

export default async function MemberPermissionsPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  const ctx = await requireOrgPermission("member_permissions.manage");
  const [t, tr] = await Promise.all([
    getTranslations("organizations.permissions"),
    getTranslations("organizations.roles"),
  ]);

  const targetData = await withTenant(ctx.org.id, async (tx) => {
    const [member] = await tx
      .select({ id: membership.id, userId: membership.userId, role: membership.role, status: membership.status })
      .from(membership)
      .where(and(eq(membership.id, membershipId), eq(membership.organizationId, ctx.org.id)))
      .limit(1);
    if (!member) return null;
    const overrides = await listPermissionOverrides(tx, membershipId);
    return { member, overrides };
  });

  if (!targetData) notFound();

  const { member: targetMember, overrides } = targetData;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/members">{t("backToMembers")}</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("heading")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("forMember", { name: `ID ${targetMember.userId}` })} ·{" "}
          <Badge variant="outline">{tr(targetMember.role as "owner" | "admin" | "member")}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("addOverride")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionOverrideForm membershipId={membershipId} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("currentOverrides", { count: overrides.length })}</h2>
        {overrides.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noOverrides")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colPermission")}</TableHead>
                <TableHead>{t("colType")}</TableHead>
                <TableHead>{t("colReason")}</TableHead>
                <TableHead className="text-right">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((ov) => (
                <TableRow key={ov.id}>
                  <TableCell className="font-mono text-xs">{ov.permissionKey}</TableCell>
                  <TableCell>
                    <Badge variant={ov.overrideType === "grant" ? "success" : "destructive"}>
                      {ov.overrideType === "grant" ? t("grant") : t("revoke")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs">{ov.reason}</TableCell>
                  <TableCell className="text-right">
                    <DeleteOverrideButton overrideId={ov.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
