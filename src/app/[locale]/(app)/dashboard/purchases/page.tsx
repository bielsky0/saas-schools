import { getTranslations } from "next-intl/server";
import { and, eq, isNull, asc } from "drizzle-orm";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { ConfirmCashPurchaseForm } from "@/features/billing/components/confirm-cash-purchase-form";
import { listClients } from "@/features/clients/data";
import { requireOrgPermission } from "@/features/organizations/context";
import { athlete, creditType, productTemplate } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

/**
 * Package sales — reception desk (langlion §2.13, EPIK 9/10, F12b).
 *
 * Gated by `credits.purchase_cash`: only reception, owner and admin may sell
 * packages at the desk. The page lists active product templates and clients
 * that already exist in the academy.
 */
export default async function PurchasesPage() {
  const { org } = await requireOrgPermission("credits.purchase_cash");
  const t = await getTranslations("credits");

  const { clients, productTemplates, athletes } = await withTenant(org.id, async (tx) => {
    const [clients, athletes, templates] = await Promise.all([
      listClients(tx, org.id),
      tx
        .select({
          id: athlete.id,
          name: athlete.name,
          parentClientId: athlete.parentClientId,
        })
        .from(athlete)
        .where(and(eq(athlete.organizationId, org.id), isNull(athlete.deletedAt)))
        .orderBy(asc(athlete.name)),
      tx
        .select({
          id: productTemplate.id,
          name: productTemplate.name,
          creditQuantity: productTemplate.creditQuantity,
          price: productTemplate.price,
        })
        .from(productTemplate)
        .where(
          and(
            eq(productTemplate.organizationId, org.id),
            eq(productTemplate.isActive, true),
          ),
        )
        .orderBy(asc(productTemplate.name)),
    ]);

    const creditTypes = await tx
      .select({ id: creditType.id, name: creditType.name })
      .from(creditType)
      .where(
        and(
          eq(creditType.organizationId, org.id),
          isNull(creditType.deletedAt),
        ),
      );

    const creditTypeMap = new Map(creditTypes.map((ct) => [ct.id, ct.name]));

    const templatesWithTypes = templates.map((t) => ({
      ...t,
      creditTypeName: creditTypeMap.get(t.id) ?? "",
    }));

    return { clients, productTemplates: templatesWithTypes, athletes };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("purchase.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("purchase.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("purchase.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {productTemplates.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("purchase.productTemplateNotFound")}</p>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("form.prerequisites")}</p>
          ) : (
            <ConfirmCashPurchaseForm
              clients={clients.map((c) => ({ id: c.id, email: c.email }))}
              productTemplates={productTemplates}
              athletes={athletes}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
