import { and, desc, eq, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { client, clientPriceOverride, groupType } from "@/lib/db/schema";
import { ClientOverrideManager } from "./client-override-manager";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { org } = await requireOrgPermission("client_price_override.manage");
  const t = await getTranslations("pricing");

  const data = await withTenant(org.id, async (tx) => {
    const [parent] = await tx
      .select()
      .from(client)
      .where(
        and(eq(client.id, clientId), eq(client.organizationId, org.id), isNull(client.deletedAt)),
      )
      .limit(1);
    if (!parent) return null;

    const overrides = await tx
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
      .orderBy(desc(clientPriceOverride.createdAt));

    const gts = await tx
      .select({ id: groupType.id, name: groupType.name })
      .from(groupType)
      .where(
        and(eq(groupType.organizationId, org.id), isNull(groupType.deletedAt)),
      )
      .orderBy(groupType.name);

    return { parent, overrides, groupTypes: gts };
  });

  if (!data) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{data.parent.email}</h1>
        {data.parent.name && (
          <p className="text-muted-foreground">{data.parent.name}</p>
        )}
      </div>

      <ClientOverrideManager
        clientId={clientId}
        groupTypes={data.groupTypes}
        overrides={data.overrides}
        labels={{
          title: t("errors.generic"),
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
