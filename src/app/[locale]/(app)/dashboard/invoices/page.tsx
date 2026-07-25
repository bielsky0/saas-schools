import { getTranslations } from "next-intl/server";

import { InvoicePendingList } from "@/features/billing/components/invoice-pending-list";
import { listPendingInvoices, listIssuedInvoices } from "@/features/billing/invoice-data";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const ctx = await requireOrgPermission("invoices.mark_issued");
  const tc = await getTranslations("credits");

  const { pending, issued } = await withTenant(ctx.org.id, async (tx) => {
    const [p, i] = await Promise.all([
      listPendingInvoices(tx, ctx.org.id),
      listIssuedInvoices(tx, ctx.org.id),
    ]);
    return { pending: p, issued: i };
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold">{tc("invoice.pendingListTitle")}</h1>
        <p className="text-muted-foreground text-sm">{tc("invoice.subtitle")}</p>
      </section>

      <InvoicePendingList pending={pending} />

      {issued.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">{tc("invoice.issuedListTitle")}</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 font-medium">{tc("invoice.client")}</th>
                <th className="pb-2 font-medium">{tc("invoice.package")}</th>
                <th className="pb-2 font-medium">{tc("invoice.amount")}</th>
                <th className="pb-2 font-medium">{tc("invoice.invoiceNumber")}</th>
                <th className="pb-2 font-medium">{tc("invoice.issuedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((row) => (
                <tr key={row.purchaseId} className="border-b last:border-0">
                  <td className="py-2">{row.clientName ?? row.clientEmail}</td>
                  <td className="py-2">{row.productTemplateName}</td>
                  <td className="py-2">{row.pricePaid / 100}</td>
                  <td className="py-2">{row.invoiceNumber ?? "—"}</td>
                  <td className="py-2">
                    {row.invoiceIssuedAt?.toLocaleDateString() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
