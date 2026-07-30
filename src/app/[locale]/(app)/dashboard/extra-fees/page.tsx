import { and, eq, isNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Badge,
  TabsContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { athlete, client, extraFee } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { ExtraFeeForm } from "./extra-fee-form";
import { ExtraFeeActions } from "./extra-fee-actions";
import { ExtraFeeTabs } from "./extra-fee-tabs";

const STATUS_TABS = ["all", "pending", "paid", "cancelled"] as const;

export default async function ExtraFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { org } = await requireOrgPermission("extra_fees.manage");
  const [t, locale] = await Promise.all([
    getTranslations("extraFees"),
    getLocale(),
  ]);

  const { status } = await searchParams;
  const activeTab = STATUS_TABS.includes(status as any) ? status as typeof STATUS_TABS[number] : "all";

  const { fees, clients } = await withTenant(org.id, async (tx) => {
    const conditions = [
      eq(extraFee.organizationId, org.id),
      eq(extraFee.isActive, true),
    ];
    if (activeTab !== "all") {
      conditions.push(eq(extraFee.status, activeTab));
    }

    const fees = await tx
      .select({
        id: extraFee.id,
        description: extraFee.description,
        amount: extraFee.amount,
        status: extraFee.status,
        paymentMethod: extraFee.paymentMethod,
        clientId: extraFee.clientId,
        athleteId: extraFee.athleteId,
        createdAt: extraFee.createdAt,
        clientName: client.name,
        clientEmail: client.email,
        athleteName: athlete.name,
      })
      .from(extraFee)
      .innerJoin(
        client,
        and(eq(client.id, extraFee.clientId), eq(client.organizationId, org.id)),
      )
      .leftJoin(
        athlete,
        and(eq(athlete.id, extraFee.athleteId), eq(athlete.organizationId, org.id)),
      )
      .where(and(...conditions))
      .orderBy(extraFee.createdAt);

    const clients = await tx
      .select({ id: client.id, name: client.name, email: client.email })
      .from(client)
      .where(and(eq(client.organizationId, org.id), isNull(client.deletedAt)))
      .orderBy(client.email);

    return { fees, clients };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <ExtraFeeForm clients={clients} />
      </div>

      <ExtraFeeTabs
        defaultValue={activeTab}
        labels={{
          all: t("filterAll"),
          pending: t("statusPending"),
          paid: t("statusPaid"),
          cancelled: t("statusCancelled"),
        }}
      />

      <TabsContent value={activeTab} className="mt-4">
        {fees.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.client")}</TableHead>
                <TableHead>{t("table.athlete")}</TableHead>
                <TableHead>{t("table.description")}</TableHead>
                <TableHead>{t("table.amount")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.method")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">
                    {fee.clientName || fee.clientEmail}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fee.athleteName || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {fee.description}
                  </TableCell>
                  <TableCell>
                    {(fee.amount / 100).toFixed(2)} {org.currency}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        fee.status === "paid"
                          ? "success"
                          : fee.status === "cancelled"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {fee.status === "pending"
                        ? t("statusPending")
                        : fee.status === "paid"
                          ? t("statusPaid")
                          : t("statusCancelled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fee.paymentMethod === "online"
                      ? t("paymentMethodOnline")
                      : t("paymentMethodCash")}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {fee.createdAt.toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ExtraFeeActions feeId={fee.id} status={fee.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </div>
  );
}
