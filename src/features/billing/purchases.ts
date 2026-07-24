import { and, eq, isNull } from "drizzle-orm";

import { recordAudit, type AuditActor } from "@/features/admin/audit";
import { issueCredits } from "@/features/credits/issue";
import { athlete, client, creditPurchase, creditType, groupType, productTemplate } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";

const log = createLogger("billing:purchases");

/** The product template was not found in this academy. */
export class ProductTemplateNotFoundError extends Error {}
/** The client does not belong to this academy. */
export class ClientNotFoundError extends Error {}
/** The requested athlete does not belong to this client. */
export class AthleteNotFoundError extends Error {}
/** The product template is not active. */
export class ProductTemplateNotActiveError extends Error {}
/**
 * The group type's policy does not allow this purchase
 * (allowed_purchase_modes/allowed_billing_types, F12e).
 */
export class PurchasePolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchasePolicyViolationError";
  }
}

export interface ConfirmCashPurchaseInput {
  organizationId: string;
  clientId: string;
  productTemplateId: string;
  /** Target a specific child, or leave empty for the family wallet. */
  athleteId?: string | null;
  /** IANA zone from `organization.timezone` — never the server's (US-1.2/AC3). */
  timeZone: string;
  actor: AuditActor;
  now?: Date;
}

export interface ConfirmCashPurchaseResult {
  purchaseId: string;
  creditsIssued: number;
  /** Data needed by the caller to run auto-fill separately. */
  autoFill: {
    clientId: string;
    clientEmail: string;
    creditTypeId: string;
    athleteId: string | null;
  };
}

/**
 * Confirm a cash package purchase at the desk (langlion §2.13, US-10.x, F12b).
 *
 * One transaction, two steps:
 *
 *   1. Create a `credit_purchase` journal entry with `paymentMethod = "cash"`.
 *   2. Issue `product_template.credit_quantity` credits, all linked to the purchase.
 *
 * Auto-fill runs SEPARATELY after this transaction commits — see
 * `purchase-actions.ts`. This split means a capacity conflict during auto-fill
 * does not roll back the purchase; the credits stay in the wallet.
 *
 * NOT a server action and deliberately not permission-checked: this is the
 * mechanism. Authorisation belongs to the call site.
 */
export async function confirmCashPurchase(
  tx: TenantDb,
  input: ConfirmCashPurchaseInput,
): Promise<ConfirmCashPurchaseResult> {
  const now = input.now ?? new Date();

  // ── Resolve product template ──────────────────────────────────────────

  const [tmpl] = await tx
    .select({
      id: productTemplate.id,
      creditTypeId: productTemplate.creditTypeId,
      creditQuantity: productTemplate.creditQuantity,
      isActive: productTemplate.isActive,
      billingType: productTemplate.billingType,
      allowedPurchaseModes: groupType.allowedPurchaseModes,
      allowedBillingTypes: groupType.allowedBillingTypes,
    })
    .from(productTemplate)
    .innerJoin(creditType, and(
      eq(creditType.id, productTemplate.creditTypeId),
      eq(creditType.organizationId, productTemplate.organizationId),
      isNull(creditType.deletedAt),
    ))
    .innerJoin(groupType, and(
      eq(groupType.id, creditType.groupTypeId),
      eq(groupType.organizationId, creditType.organizationId),
    ))
    .where(
      and(
        eq(productTemplate.id, input.productTemplateId),
        eq(productTemplate.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!tmpl) throw new ProductTemplateNotFoundError(input.productTemplateId);
  if (!tmpl.isActive) throw new ProductTemplateNotActiveError(input.productTemplateId);

  // US-23.6 AC2/AC3: sprawdź politykę grupy (F12e).
  if (!tmpl.allowedPurchaseModes.includes("package")) {
    throw new PurchasePolicyViolationError("Package purchases are not allowed for this group type");
  }
  if (tmpl.allowedBillingTypes && !tmpl.allowedBillingTypes.includes(tmpl.billingType)) {
    throw new PurchasePolicyViolationError("This billing type is not allowed for this group type");
  }

  // ── Resolve client ────────────────────────────────────────────────────

  const [parent] = await tx
    .select({ id: client.id, email: client.email })
    .from(client)
    .where(
      and(
        eq(client.id, input.clientId),
        eq(client.organizationId, input.organizationId),
        isNull(client.deletedAt),
      ),
    )
    .limit(1);
  if (!parent) throw new ClientNotFoundError(input.clientId);

  // ── Resolve athlete (optional) ────────────────────────────────────────

  if (input.athleteId) {
    const [ath] = await tx
      .select({ id: athlete.id })
      .from(athlete)
      .where(
        and(
          eq(athlete.id, input.athleteId),
          eq(athlete.organizationId, input.organizationId),
          eq(athlete.parentClientId, parent.id),
          isNull(athlete.deletedAt),
        ),
      )
      .limit(1);
    if (!ath) throw new AthleteNotFoundError(input.athleteId);
  }

  // ── Resolve credit type from the template ─────────────────────────────

  const [ct] = await tx
    .select({ id: creditType.id })
    .from(creditType)
    .where(
      and(
        eq(creditType.id, tmpl.creditTypeId),
        eq(creditType.organizationId, input.organizationId),
        isNull(creditType.deletedAt),
      ),
    )
    .limit(1);
  if (!ct) throw new ProductTemplateNotFoundError(input.productTemplateId);

  // ── Create the purchase journal entry ─────────────────────────────────

  const [purchase] = await tx
    .insert(creditPurchase)
    .values({
      organizationId: input.organizationId,
      clientId: parent.id,
      productTemplateId: tmpl.id,
      athleteId: input.athleteId ?? null,
      quantity: tmpl.creditQuantity,
      paymentMethod: "cash",
    })
    .returning({ id: creditPurchase.id });
  if (!purchase) throw new Error("confirmCashPurchase: credit_purchase insert returned no row");

  // ── Issue credits, linked to the purchase ─────────────────────────────

  const issued = await issueCredits(tx, {
    organizationId: input.organizationId,
    clientId: parent.id,
    creditTypeId: ct.id,
    athleteId: input.athleteId ?? null,
    quantity: tmpl.creditQuantity,
    source: "package_cash",
    timeZone: input.timeZone,
    creditPurchaseId: purchase.id,
    issuedAt: now,
  });

  // ── Audit ─────────────────────────────────────────────────────────────

  await recordAudit(tx, {
    action: "credit.purchase_cash",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "credit_purchase",
    targetId: purchase.id,
    targetLabel: `package ${tmpl.id}`,
    metadata: {
      purchaseId: purchase.id,
      productTemplateId: tmpl.id,
      creditTypeId: ct.id,
      clientId: parent.id,
      athleteId: input.athleteId ?? null,
      quantity: tmpl.creditQuantity,
      creditsIssued: issued.length,
    },
  });

  log.info("cash purchase confirmed", {
    purchaseId: purchase.id,
    clientId: parent.id,
    creditsIssued: issued.length,
  });

  return {
    purchaseId: purchase.id,
    creditsIssued: issued.length,
    autoFill: {
      clientId: parent.id,
      clientEmail: parent.email,
      creditTypeId: ct.id,
      athleteId: input.athleteId ?? null,
    },
  };
}
