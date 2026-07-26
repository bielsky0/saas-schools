import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listExtraFees } from "@/features/extra-fees/data";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function ExtraFeesPage() {
  const ctx = await requireOrgPermission("extra_fees.manage");
  const t = await getTranslations("extraFees");

  const fees = await withTenant(ctx.org.id, (tx) =>
    listExtraFees(tx, ctx.org.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {fees.length === 0 ? (
        <p className="text-muted-foreground">No additional fees created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2 font-medium">Description</th>
                <th className="p-2 font-medium">Amount</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Method</th>
                <th className="p-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-b">
                  <td className="p-2">{fee.description}</td>
                  <td className="p-2">{(fee.amount / 100).toFixed(2)}</td>
                  <td className="p-2">
                    <span
                      className={
                        fee.status === "paid"
                          ? "text-green-600"
                          : fee.status === "cancelled"
                            ? "text-red-600"
                            : "text-amber-600"
                      }
                    >
                      {t(
                        fee.status === "pending"
                          ? "statusPending"
                          : fee.status === "paid"
                            ? "statusPaid"
                            : "statusCancelled",
                      )}
                    </span>
                  </td>
                  <td className="p-2">
                    {fee.paymentMethod === "online"
                      ? t("paymentMethodOnline")
                      : t("paymentMethodCash")}
                  </td>
                  <td className="p-2">
                    {fee.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
