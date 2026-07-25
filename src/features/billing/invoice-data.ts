import { and, asc, desc, eq, getTableColumns, isNotNull, isNull } from "drizzle-orm";

import { creditPurchase, productTemplate, client } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * List credit purchases for a client with invoice status (EPIK 27, US-27.1).
 * Used by the client portal to show "request invoice" buttons.
 */
export async function listClientPurchases(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
) {
  const rows = await tx
    .select({
      ...getTableColumns(creditPurchase),
      productTemplateName: productTemplate.name,
    })
    .from(creditPurchase)
    .innerJoin(
      productTemplate,
      and(
        eq(productTemplate.id, creditPurchase.productTemplateId),
        eq(productTemplate.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(creditPurchase.organizationId, organizationId),
        eq(creditPurchase.clientId, clientId),
      ),
    )
    .orderBy(desc(creditPurchase.createdAt));
  return rows;
}

export interface PendingInvoiceRow {
  purchaseId: string;
  clientName: string | null;
  clientEmail: string;
  pricePaid: number;
  productTemplateName: string;
  invoiceRequestedAt: Date | null;
}

export async function listPendingInvoices(
  tx: TenantDb,
  organizationId: string,
): Promise<PendingInvoiceRow[]> {
  return tx
    .select({
      purchaseId: creditPurchase.id,
      clientName: client.name,
      clientEmail: client.email,
      pricePaid: creditPurchase.pricePaid,
      productTemplateName: productTemplate.name,
      invoiceRequestedAt: creditPurchase.invoiceRequestedAt,
    })
    .from(creditPurchase)
    .innerJoin(
      client,
      and(eq(client.id, creditPurchase.clientId), eq(client.organizationId, organizationId)),
    )
    .innerJoin(
      productTemplate,
      and(
        eq(productTemplate.id, creditPurchase.productTemplateId),
        eq(productTemplate.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(creditPurchase.organizationId, organizationId),
        isNull(creditPurchase.invoiceIssuedAt),
      ),
    )
    .orderBy(asc(creditPurchase.invoiceRequestedAt));
}

export interface IssuedInvoiceRow {
  purchaseId: string;
  clientName: string | null;
  clientEmail: string;
  pricePaid: number;
  productTemplateName: string;
  invoiceNumber: string | null;
  invoiceIssuedAt: Date | null;
}

export async function listIssuedInvoices(
  tx: TenantDb,
  organizationId: string,
): Promise<IssuedInvoiceRow[]> {
  return tx
    .select({
      purchaseId: creditPurchase.id,
      clientName: client.name,
      clientEmail: client.email,
      pricePaid: creditPurchase.pricePaid,
      productTemplateName: productTemplate.name,
      invoiceNumber: creditPurchase.invoiceNumber,
      invoiceIssuedAt: creditPurchase.invoiceIssuedAt,
    })
    .from(creditPurchase)
    .innerJoin(
      client,
      and(eq(client.id, creditPurchase.clientId), eq(client.organizationId, organizationId)),
    )
    .innerJoin(
      productTemplate,
      and(
        eq(productTemplate.id, creditPurchase.productTemplateId),
        eq(productTemplate.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(creditPurchase.organizationId, organizationId),
        isNotNull(creditPurchase.invoiceIssuedAt),
      ),
    )
    .orderBy(desc(creditPurchase.invoiceIssuedAt));
}
