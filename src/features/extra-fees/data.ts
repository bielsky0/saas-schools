import { and, asc, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";

import { athlete, booking, client, extraFee } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * Data access for extra_fee (Faza 27, §2.41, EPIK 42).
 *
 * One-time ad-hoc charges outside the credit system. Status transitions:
 *   pending → paid (cash confirm or webhook)
 *   pending → cancelled (cancel)
 *
 * paid → cancelled is explicitly blocked at the action layer.
 *
 * Race condition protection: cash confirm and online webhook both lock
 * the row via .for("update") and guard on status="pending". See
 * lockAndConfirmCashExtraFee and the webhook handler.
 */

export async function getExtraFee(
  tx: TenantDb,
  organizationId: string,
  id: string,
) {
  const [row] = await tx
    .select()
    .from(extraFee)
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
        eq(extraFee.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listExtraFees(
  tx: TenantDb,
  organizationId: string,
  opts?: {
    status?: "pending" | "paid" | "cancelled";
    clientId?: string;
    sessionId?: string;
  },
) {
  const conditions = [
    eq(extraFee.organizationId, organizationId),
    eq(extraFee.isActive, true),
  ];
  if (opts?.status) conditions.push(eq(extraFee.status, opts.status));
  if (opts?.clientId) conditions.push(eq(extraFee.clientId, opts.clientId));
  if (opts?.sessionId) conditions.push(eq(extraFee.sessionId, opts.sessionId));

  return tx
    .select()
    .from(extraFee)
    .where(and(...conditions))
    .orderBy(desc(extraFee.createdAt));
}

export async function createExtraFee(
  tx: TenantDb,
  values: {
    organizationId: string;
    clientId: string;
    athleteId?: string | null;
    bookingId?: string | null;
    groupTypeId?: string | null;
    sessionId?: string | null;
    amount: number;
    currencySnapshot: { amount: number; currency: string };
    description: string;
    paymentMethod: "online" | "cash";
    createdByUserId: string;
  },
) {
  const [row] = await tx
    .insert(extraFee)
    .values({
      organizationId: values.organizationId,
      clientId: values.clientId,
      athleteId: values.athleteId ?? null,
      bookingId: values.bookingId ?? null,
      groupTypeId: values.groupTypeId ?? null,
      sessionId: values.sessionId ?? null,
      amount: values.amount,
      currencySnapshot: values.currencySnapshot,
      description: values.description,
      status: "pending",
      paymentMethod: values.paymentMethod,
      createdByUserId: values.createdByUserId,
    })
    .returning();
  if (!row) throw new Error("createExtraFee: insert returned no row");
  return row;
}

/**
 * Lock and confirm a pending extra_fee as paid (cash path).
 *
 * Guards against race with the online webhook via .for("update") row lock
 * and WHERE status = 'pending'. Returns null if the fee was already confirmed
 * (by a concurrent webhook) — caller must throw an appropriate error.
 */
export async function lockAndConfirmCashExtraFee(
  tx: TenantDb,
  organizationId: string,
  id: string,
) {
  const [row] = await tx
    .select({ id: extraFee.id, status: extraFee.status })
    .from(extraFee)
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
      ),
    )
    .limit(1)
    .for("update");

  if (!row) return null;

  if (row.status !== "pending") {
    return null;
  }

  const [updated] = await tx
    .update(extraFee)
    .set({ status: "paid" })
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
        eq(extraFee.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}

/**
 * Mark an extra_fee as paid by webhook (online path).
 *
 * Same lock + guard pattern as lockAndConfirmCashExtraFee — both paths
 * race against each other via .for("update") + WHERE status = 'pending'.
 */
export async function markExtraFeePaidByWebhook(
  tx: TenantDb,
  organizationId: string,
  id: string,
  stripePaymentIntentId: string,
) {
  const [row] = await tx
    .select({ id: extraFee.id, status: extraFee.status })
    .from(extraFee)
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
      ),
    )
    .limit(1)
    .for("update");

  if (!row) return null;
  if (row.status !== "pending") return null;

  const [updated] = await tx
    .update(extraFee)
    .set({
      status: "paid",
      stripePaymentIntentId,
    })
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
        eq(extraFee.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}

/**
 * Cancel (soft-delete) an extra_fee. Only pending fees can be cancelled —
 * paid fees are blocked at the action layer with a 409.
 */
export async function cancelExtraFee(
  tx: TenantDb,
  organizationId: string,
  id: string,
) {
  const [updated] = await tx
    .update(extraFee)
    .set({
      status: "cancelled",
      isActive: false,
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
        eq(extraFee.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function markInvoiceRequested(
  tx: TenantDb,
  organizationId: string,
  id: string,
) {
  await tx
    .update(extraFee)
    .set({ invoiceRequestedAt: new Date() })
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
      ),
    );
}

export async function markInvoiceIssued(
  tx: TenantDb,
  organizationId: string,
  id: string,
  invoiceNumber: string,
  issuedByUserId: string | null,
) {
  await tx
    .update(extraFee)
    .set({
      invoiceIssuedAt: new Date(),
      invoiceNumber,
      invoiceIssuedByUserId: issuedByUserId,
    })
    .where(
      and(
        eq(extraFee.id, id),
        eq(extraFee.organizationId, organizationId),
      ),
    );
}

/**
 * Get all bookings for a session (for bulk create).
 */
export async function listSessionBookings(
  tx: TenantDb,
  organizationId: string,
  sessionId: string,
) {
  return tx
    .select({
      bookingId: booking.id,
      athleteId: booking.athleteId,
      clientId: athlete.parentClientId,
    })
    .from(booking)
    .innerJoin(athlete, and(eq(athlete.id, booking.athleteId), eq(athlete.organizationId, organizationId)))
    .where(
      and(
        eq(booking.sessionId, sessionId),
        eq(booking.organizationId, organizationId),
        ne(booking.paymentStatus, "cancelled"),
      ),
    );
}

// ── Invoice listing (same pattern as invoice-data.ts for credit_purchase) ──

export async function listClientExtraFees(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
) {
  return tx
    .select()
    .from(extraFee)
    .where(
      and(
        eq(extraFee.organizationId, organizationId),
        eq(extraFee.clientId, clientId),
        eq(extraFee.isActive, true),
      ),
    )
    .orderBy(desc(extraFee.createdAt));
}

export interface PendingExtraFeeInvoiceRow {
  extraFeeId: string;
  clientName: string | null;
  clientEmail: string;
  amount: number;
  description: string;
  invoiceRequestedAt: Date | null;
}

export async function listExtraFeePendingInvoices(
  tx: TenantDb,
  organizationId: string,
): Promise<PendingExtraFeeInvoiceRow[]> {
  return tx
    .select({
      extraFeeId: extraFee.id,
      clientName: client.name,
      clientEmail: client.email,
      amount: extraFee.amount,
      description: extraFee.description,
      invoiceRequestedAt: extraFee.invoiceRequestedAt,
    })
    .from(extraFee)
    .innerJoin(
      client,
      and(eq(client.id, extraFee.clientId), eq(client.organizationId, organizationId)),
    )
    .where(
      and(
        eq(extraFee.organizationId, organizationId),
        eq(extraFee.status, "paid"),
        isNull(extraFee.invoiceIssuedAt),
        eq(extraFee.isActive, true),
      ),
    )
    .orderBy(asc(extraFee.invoiceRequestedAt));
}

export interface IssuedExtraFeeInvoiceRow {
  extraFeeId: string;
  clientName: string | null;
  clientEmail: string;
  amount: number;
  description: string;
  invoiceNumber: string | null;
  invoiceIssuedAt: Date | null;
}

export async function listExtraFeeIssuedInvoices(
  tx: TenantDb,
  organizationId: string,
): Promise<IssuedExtraFeeInvoiceRow[]> {
  return tx
    .select({
      extraFeeId: extraFee.id,
      clientName: client.name,
      clientEmail: client.email,
      amount: extraFee.amount,
      description: extraFee.description,
      invoiceNumber: extraFee.invoiceNumber,
      invoiceIssuedAt: extraFee.invoiceIssuedAt,
    })
    .from(extraFee)
    .innerJoin(
      client,
      and(eq(client.id, extraFee.clientId), eq(client.organizationId, organizationId)),
    )
    .where(
      and(
        eq(extraFee.organizationId, organizationId),
        isNotNull(extraFee.invoiceIssuedAt),
        eq(extraFee.isActive, true),
      ),
    )
    .orderBy(desc(extraFee.invoiceIssuedAt));
}
