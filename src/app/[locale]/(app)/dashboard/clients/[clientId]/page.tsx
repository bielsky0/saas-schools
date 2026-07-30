import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { athlete, booking, client, clientPriceOverride, groupType } from "@/lib/db/schema";
import { listCreditsForClient } from "@/features/credits/data";
import { ACTIVE_BOOKING_FILTER } from "@/features/bookings/data";
import { ClientOverrideManager } from "./client-override-manager";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { org } = await requireOrgPermission("members.invite");
  const [t, tc, locale] = await Promise.all([
    getTranslations("dashboard.clients"),
    getTranslations("credits"),
    getLocale(),
  ]);

  const data = await withTenant(org.id, async (tx) => {
    const [parent] = await tx
      .select()
      .from(client)
      .where(
        and(eq(client.id, clientId), eq(client.organizationId, org.id), isNull(client.deletedAt)),
      )
      .limit(1);
    if (!parent) return null;

    const [children, credits, overrides, gts] = await Promise.all([
      tx
        .select()
        .from(athlete)
        .where(
          and(
            eq(athlete.organizationId, org.id),
            eq(athlete.parentClientId, clientId),
            isNull(athlete.deletedAt),
          ),
        )
        .orderBy(athlete.name),
      listCreditsForClient(tx, org.id, clientId),
      tx
        .select({
          id: clientPriceOverride.id,
          groupTypeId: clientPriceOverride.groupTypeId,
          overrideType: clientPriceOverride.overrideType,
          value: clientPriceOverride.value,
          validFrom: clientPriceOverride.validFrom,
          validUntil: clientPriceOverride.validUntil,
          reason: clientPriceOverride.reason,
          isActive: clientPriceOverride.isActive,
          createdAt: clientPriceOverride.createdAt,
        })
        .from(clientPriceOverride)
        .where(
          and(
            eq(clientPriceOverride.organizationId, org.id),
            eq(clientPriceOverride.clientId, clientId),
          ),
        )
        .orderBy(desc(clientPriceOverride.createdAt)),
      tx
        .select({ id: groupType.id, name: groupType.name })
        .from(groupType)
        .where(and(eq(groupType.organizationId, org.id), isNull(groupType.deletedAt)))
        .orderBy(groupType.name),
    ]);

    const athleteIds = children.map((c) => c.id);

    const activeBookings = athleteIds.length > 0
      ? await tx
          .select()
          .from(booking)
          .where(
            and(
              eq(booking.organizationId, org.id),
              inArray(booking.athleteId, athleteIds),
              ACTIVE_BOOKING_FILTER,
            ),
          )
          .orderBy(booking.sessionStartTime)
      : [];

    return { parent, children, activeBookings, credits, overrides, gts };
  });

  if (!data) notFound();

  return (
    <div className="space-y-8">
      {/* Client info */}
      <div>
        <h1 className="text-2xl font-bold">{data.parent.name || data.parent.email}</h1>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-sm">
          <span>{data.parent.email}</span>
          {data.parent.phone && <span>{data.parent.phone}</span>}
          {!data.parent.isVerified && (
            <Badge variant="outline">{t("unverified")}</Badge>
          )}
        </div>
      </div>

      {/* Children */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("children.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.children.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("children.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("children.name")}</TableHead>
                  <TableHead>{t("children.age")}</TableHead>
                  <TableHead>{t("children.bookings")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.children.map((child) => {
                  const childBookings = data.activeBookings.filter(
                    (b) => b.athleteId === child.id,
                  );
                  return (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {child.age ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {childBookings.length}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("bookings.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.activeBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("bookings.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("bookings.athlete")}</TableHead>
                  <TableHead>{t("bookings.date")}</TableHead>
                  <TableHead>{t("bookings.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.activeBookings.map((b) => {
                  const child = data.children.find((c) => c.id === b.athleteId);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {child?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.sessionStartTime.toLocaleDateString(locale, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            b.paymentStatus === "confirmed"
                              ? "success"
                              : b.paymentStatus === "payment_pending"
                                ? "warning"
                                : "outline"
                          }
                        >
                          {b.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Credit history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{tc("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.credits.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tc("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>{tc("table.source")}</TableHead>
                <TableHead>{tc("table.status")}</TableHead>
                <TableHead>{tc("table.validUntil")}</TableHead>
                <TableHead>{tc("table.reason")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="text-muted-foreground">{credit.source}</TableCell>
                    <TableCell>{credit.creditTypeId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          credit.status === "available"
                            ? "success"
                            : credit.status === "used"
                              ? "outline"
                              : credit.status === "expired"
                                ? "warning"
                                : "destructive"
                        }
                      >
                        {credit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {credit.validUntil
                        ? new Intl.DateTimeFormat(locale, {
                            timeZone: org.timezone,
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(credit.validUntil.getTime() - 1))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {credit.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Price overrides */}
      <ClientOverrideManager
        clientId={clientId}
        groupTypes={data.gts}
        overrides={data.overrides}
        labels={{
          title: "Price Overrides",
          active: "Active",
          inactive: "Inactive",
          percentDiscount: "Percent discount",
          fixedPrice: "Fixed price",
          validFrom: "Valid from",
          validUntil: "Valid until",
          reason: "Reason",
          deactivate: "Deactivate",
          noOverrides: "No price overrides yet.",
        }}
      />
    </div>
  );
}
