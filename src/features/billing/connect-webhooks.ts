import { and, eq } from "drizzle-orm";

import type {
  ConnectAccountEvent,
  ConnectPaymentEvent,
  ConnectSubscriptionEvent,
} from "@/lib/adapters/billing";
import { billing } from "@/lib/adapters/billing";
import { booking, classSession, creditType, groupChangeRequest, organization, webhookEvent } from "@/lib/db/schema";
import { athlete, client } from "@/lib/db/schema";
import { clientStripeCustomer, clientSubscription, creditPurchase, productTemplate } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { withSystemBypass } from "@/lib/db/system";
import type { TenantDb } from "@/lib/db/tenant";
import { clientEnv } from "@/lib/env/client";
import { createLogger } from "@/lib/logger";
import { issueCredits } from "@/features/credits/issue";
import { spendCredit } from "@/features/credits/consume";
import { autoFillCredits } from "@/features/billing/auto-fill";
import { emitDomainNotification } from "@/features/notifications/emit";
import { updateConnectStatus } from "./connect-data";

const log = createLogger("billing:connect:webhook");

export type ConnectProcessResult =
  | { status: "processed" }
  | { status: "duplicate" }
  | { status: "unknown_account" };

/**
 * Find an organization by its connected Stripe account id.
 *
 * BYPASS: the account id arrives on an unauthenticated webhook from outside;
 * nothing in it names a tenant until this row maps it to one. Same pattern
 * as `findBillingCustomer` in `./cross-tenant.ts`.
 */
async function findOrgByConnectAccountId(accountId: string) {
  return withSystemBypass(
    "connect webhook — owner unknown until the acct_ id resolves",
    async (tx) => {
      const [row] = await tx
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.stripeConnectAccountId, accountId))
        .limit(1);
      return row ?? null;
    },
  );
}

/**
 * Process one verified Connect event.
 *
 * Unlike the platform billing webhook, Connect events have no idempotency
 * marker table. account.updated is a state-sync signal, not a transactional
 * event — Stripe may send it many times. The UPDATE is idempotent by nature:
 * applying the same status twice changes nothing.
 */
export async function processConnectEvent(
  event: ConnectAccountEvent,
): Promise<ConnectProcessResult> {
  const org = await findOrgByConnectAccountId(event.accountId);
  if (!org) {
    log.warn("ignoring Connect event for unknown account", {
      event: event.id,
      type: event.type,
      account: event.accountId,
    });
    return { status: "unknown_account" };
  }

  // Write via system bypass: the webhook has no user session, and the
  // organization's RLS policy does not apply to unauthenticated requests.
  await withSystemBypass(
    "connect webhook — no user session, RLS does not apply",
    async (tx) => {
      await updateConnectStatus(
        tx,
        org.id,
        event.status,
        event.chargesEnabled,
        event.payoutsEnabled,
      );
    },
  );

  log.info("processed Connect event", {
    event: event.id,
    type: event.type,
    account: event.accountId,
    orgId: org.id,
    status: event.status,
  });

  return { status: "processed" };
}

/**
 * Process a Connect payment event (checkout.session.completed).
 *
 * Dispatches to the correct sub-handler based on `metadata.purchaseKind`,
 * set at session creation time. Three sources produce the same event type
 * on the same webhook endpoint:
 *   - "booking_payment" — F11 single-class payment
 *   - "package_purchase" — F12c one-time package purchase
 *   - "subscription_initial" — F12d subscription signup
 */
export async function processConnectPaymentEvent(
  event: ConnectPaymentEvent,
): Promise<ConnectProcessResult> {
  const purchaseKind = event.metadata.purchaseKind as string | undefined;

  if (!purchaseKind) {
    log.warn("ignoring Connect payment event without purchaseKind", {
      event: event.id,
    });
    return { status: "unknown_account" };
  }

  switch (purchaseKind) {
    case "booking_payment":
      return processBookingPayment(event);
    case "package_purchase":
      return processPackagePurchase(event);
    case "subscription_initial":
      return processSubscriptionInitial(event);
    case "group_change_payment":
      return processGroupChangePayment(event);
    default:
      log.warn("ignoring Connect payment event with unknown purchaseKind", {
        event: event.id,
        purchaseKind,
      });
      return { status: "unknown_account" };
  }
}

/**
 * Process a single-class online payment (F11, purchaseKind = "booking_payment").
 *
 * In one atomic transaction:
 *   1. Idempotency check via webhook_event marker
 *   2. Resolve booking + credit type
 *   3. Issue credit with source "online_payment"
 *   4. Spend the exact credit just issued (NOT FIFO)
 *   5. Confirm the booking
 *
 * The credit is created and consumed in the same transaction, so it never
 * appears as "available" in the wallet (US-5.1/AC3).
 */
async function processBookingPayment(
  event: ConnectPaymentEvent,
): Promise<ConnectProcessResult> {
  // Extract metadata written at session creation time.
  const orgId = event.metadata.organizationId;
  const bookingId = event.metadata.bookingId;
  if (!orgId || !bookingId) {
    log.warn("ignoring Connect payment event without org/booking metadata", {
      event: event.id,
    });
    return { status: "unknown_account" };
  }

  return withSystemBypass(
    "connect payment webhook — no user session, RLS does not apply",
    async (tx) => {
      // ── 1. Idempotency ────────────────────────────────────────────────────
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: orgId,
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate Connect payment event", { event: event.id });
        return { status: "duplicate" } as const;
      }

      // ── 2. Resolve booking ────────────────────────────────────────────────
      const [bookingRow] = await tx
        .select({
          id: booking.id,
          athleteId: booking.athleteId,
          sessionId: booking.sessionId,
          paymentStatus: booking.paymentStatus,
        })
        .from(booking)
        .where(eq(booking.id, bookingId))
        .limit(1);

      if (!bookingRow) {
        log.error("Connect payment event references unknown booking", {
          event: event.id,
          bookingId,
        });
        return { status: "unknown_account" };
      }

      // Already confirmed — idempotency marker already prevented double
      // processing, but a racing webhook may have confirmed it between the
      // marker insert and this read.
      if (bookingRow.paymentStatus === "confirmed") {
        log.info("booking already confirmed", { event: event.id, bookingId });
        return { status: "processed" };
      }

      // ── 3. Resolve athlete → parent client ────────────────────────────────
      const [athleteRow] = await tx
        .select({ parentClientId: athlete.parentClientId })
        .from(athlete)
        .where(eq(athlete.id, bookingRow.athleteId))
        .limit(1);

      if (!athleteRow) {
        log.error("booking references unknown athlete", {
          event: event.id,
          bookingId,
          athleteId: bookingRow.athleteId,
        });
        return { status: "unknown_account" };
      }

      // ── 4. Resolve session → group type → credit type ─────────────────────
      const [sessionRow] = await tx
        .select({ groupTypeId: classSession.groupTypeId })
        .from(classSession)
        .where(eq(classSession.id, bookingRow.sessionId))
        .limit(1);

      if (!sessionRow) {
        log.error("booking references unknown session", {
          event: event.id,
          bookingId,
          sessionId: bookingRow.sessionId,
        });
        return { status: "unknown_account" };
      }

      const [creditTypeRow] = await tx
        .select({ id: creditType.id })
        .from(creditType)
        .where(eq(creditType.groupTypeId, sessionRow.groupTypeId))
        .limit(1);

      if (!creditTypeRow) {
        log.error("session's group type has no credit type", {
          event: event.id,
          groupTypeId: sessionRow.groupTypeId,
        });
        return { status: "unknown_account" };
      }

      // Resolve org timezone for credit validity calculation.
      const [orgRow] = await tx
        .select({ timezone: organization.timezone })
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1);

      const timeZone = orgRow?.timezone ?? "UTC";

      // ── 5. Only process paid events ───────────────────────────────────────
      // "unpaid" means the payment method requires async confirmation.
      // The booking stays payment_pending; a follow-up event may arrive.
      if (event.paymentStatus !== "paid") {
        log.info("Connect payment event not yet paid", {
          event: event.id,
          paymentStatus: event.paymentStatus,
        });
        return { status: "processed" };
      }

      // ── 6. Issue credit (source: online_payment) ──────────────────────────
      const issued = await issueCredits(tx, {
        organizationId: orgId,
        clientId: athleteRow.parentClientId,
        creditTypeId: creditTypeRow.id,
        athleteId: bookingRow.athleteId,
        quantity: 1,
        source: "online_payment",
        timeZone,
        sourceBookingId: bookingRow.id,
      });

      if (issued.length === 0) {
        throw new Error("issueCredits returned no rows");
      }
      const issuedCredit = issued[0]!;

      // ── 7. Spend the exact credit (NOT FIFO) ──────────────────────────────
      // We must consume the credit we just issued, not an older one from the
      // wallet. Using FIFO here could leave the online_payment credit dormant
      // and consume a different credit instead.
      await spendCredit(tx, {
        organizationId: orgId,
        creditId: issuedCredit.id,
        bookingId: bookingRow.id,
      });

      // ── 8. Confirm booking ────────────────────────────────────────────────
      await tx
        .update(booking)
        .set({ paymentStatus: "confirmed", updatedAt: new Date() })
        .where(and(eq(booking.id, bookingRow.id), eq(booking.organizationId, orgId)));

      log.info("processed Connect payment event", {
        event: event.id,
        bookingId: bookingRow.id,
        creditId: issuedCredit.id,
      });

      return { status: "processed" };
    },
  );
}

/**
 * Process a group change payment (Faza 15, purchaseKind = "group_change_payment").
 *
 * When the client pays the price_difference (> 0), the change request transitions
 * from `awaiting_payment` to `completed`. The resulting booking is confirmed.
 * The source booking remains cancelled (already done at approve time).
 *
 * Idempotent via webhook_event marker + status check.
 */
async function processGroupChangePayment(
  event: ConnectPaymentEvent,
): Promise<ConnectProcessResult> {
  const orgId = event.metadata.organizationId;
  const requestId = event.metadata.bookingId; // bookingId field holds groupChangeRequestId
  if (!orgId || !requestId) {
    log.warn("ignoring group_change_payment event without org/request metadata", {
      event: event.id,
    });
    return { status: "unknown_account" };
  }

  return withSystemBypass(
    "group_change_payment webhook — no user session, RLS does not apply",
    async (tx) => {
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: orgId,
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate group_change_payment event", { event: event.id });
        return { status: "duplicate" as const };
      }

      const [gcr] = await tx
        .select({
          id: groupChangeRequest.id,
          status: groupChangeRequest.status,
          resultingBookingId: groupChangeRequest.resultingBookingId,
        })
        .from(groupChangeRequest)
        .where(
          and(
            eq(groupChangeRequest.id, requestId),
            eq(groupChangeRequest.organizationId, orgId),
          ),
        )
        .limit(1);

      if (!gcr) {
        log.error("group_change_payment references unknown request", {
          event: event.id,
          requestId,
        });
        return { status: "unknown_account" };
      }

      if (gcr.status !== "awaiting_payment") {
        log.info("group change request not awaiting payment", {
          event: event.id,
          requestId,
          status: gcr.status,
        });
        return { status: "processed" };
      }

      if (event.paymentStatus !== "paid") {
        log.info("group_change_payment event not yet paid", {
          event: event.id,
          paymentStatus: event.paymentStatus,
        });
        return { status: "processed" };
      }

      // Confirm the resulting booking.
      if (gcr.resultingBookingId) {
        await tx
          .update(booking)
          .set({ paymentStatus: "confirmed", updatedAt: new Date() })
          .where(
            and(
              eq(booking.id, gcr.resultingBookingId),
              eq(booking.organizationId, orgId),
            ),
          );
      }

      // Update request to completed.
      await tx
        .update(groupChangeRequest)
        .set({
          status: "completed",
          stripePaymentIntentId: event.sessionId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groupChangeRequest.id, requestId),
            eq(groupChangeRequest.organizationId, orgId),
          ),
        );

      // Audit the webhook finalization.
      const { recordAudit, SYSTEM_ACTOR } = await import("@/features/admin/audit");
      await recordAudit(tx, {
        action: "group_change.complete",
        actor: SYSTEM_ACTOR,
        organizationId: orgId,
        targetType: "group_change_request",
        targetId: requestId,
        targetLabel: requestId,
        metadata: {
          stripeEventId: event.id,
          resultingBookingId: gcr.resultingBookingId,
        },
      });

      log.info("group_change_payment completed", {
        event: event.id,
        requestId,
        resultingBookingId: gcr.resultingBookingId,
      });

      return { status: "processed" as const };
    },
  );
}

/**
 * Process a one-time package purchase (F12c, purchaseKind = "package_purchase").
 *
 * Two steps, two transactions:
 *   1. Idempotency marker + credit_purchase + issue credits (one tx).
 *   2. Auto-fill (separately, per-booking mini-transactions, same pattern as
 *      purchase-actions.ts).
 *
 * Credits go to the family wallet (athleteId = null) because the online
 * checkout does not know which child will attend. Auto-fill attempts to book
 * all children for upcoming sessions.
 *
 * REGUŁA (podfaza e): Ten handler NIGDY nie waliduje
 * allowed_purchase_modes/allowed_billing_types — walidacja polityki
 * dotyczy wyłącznie ścieżki zakupowej (checkout action + UI). Ścieżka
 * webhookowa musi pozostać policy-free, żeby spełnić nieretroaktywność
 * (US-23.6/AC1, F12e).
 */
async function processPackagePurchase(
  event: ConnectPaymentEvent,
): Promise<ConnectProcessResult> {
  const orgId = event.metadata.organizationId;
  const clientId = event.metadata.clientId;
  const creditTypeId = event.metadata.creditTypeId;
  const productTemplateId = event.metadata.productTemplateId;
  const rawQty = event.metadata.quantity;

  if (!orgId || !clientId || !creditTypeId || !productTemplateId || !rawQty) {
    log.warn("ignoring package_purchase event with incomplete metadata", {
      event: event.id,
    });
    return { status: "unknown_account" };
  }
  const quantity = Number(rawQty);
  if (!Number.isFinite(quantity) || quantity < 1) {
    log.warn("ignoring package_purchase event with invalid quantity", {
      event: event.id,
      quantity: rawQty,
    });
    return { status: "unknown_account" };
  }

  // Only process paid events.
  if (event.paymentStatus !== "paid") {
    log.info("package_purchase event not yet paid", {
      event: event.id,
      paymentStatus: event.paymentStatus,
    });
    return { status: "processed" };
  }

  // Step 1: idempotency + purchase + credits in one transaction.
  const step1Result = await withSystemBypass(
    "package_purchase webhook — no user session, RLS does not apply",
    async (tx) => {
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: orgId,
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate package_purchase event", { event: event.id });
        return { status: "duplicate" as const };
      }

      const [orgRow] = await tx
        .select({ timezone: organization.timezone, currency: organization.currency })
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1);
      if (!orgRow) {
        log.error("package_purchase event references unknown org", { event: event.id, orgId });
        return { status: "unknown_account" as const };
      }

      const [parent] = await tx
        .select({ id: client.id, email: client.email })
        .from(client)
        .where(eq(client.id, clientId))
        .limit(1);
      if (!parent) {
        log.error("package_purchase event references unknown client", {
          event: event.id,
          clientId,
        });
        return { status: "unknown_account" as const };
      }

      const [purchase] = await tx
        .insert(creditPurchase)
        .values({
          organizationId: orgId,
          clientId: parent.id,
          productTemplateId,
          athleteId: null,
          quantity,
          paymentMethod: "online_one_time",
          stripeSessionId: event.sessionId,
        })
        .returning({ id: creditPurchase.id });
      if (!purchase) {
        throw new Error("processPackagePurchase: credit_purchase insert returned no row");
      }

      const issued = await issueCredits(tx, {
        organizationId: orgId,
        clientId: parent.id,
        creditTypeId,
        athleteId: null,
        quantity,
        source: "package_online",
        timeZone: orgRow.timezone,
        creditPurchaseId: purchase.id,
      });

      log.info("package_purchase: credits issued", {
        event: event.id,
        purchaseId: purchase.id,
        clientId: parent.id,
        credits: issued.length,
      });

      return {
        status: "processed" as const,
        autoFillParams: {
          clientId: parent.id,
          clientEmail: parent.email,
          creditTypeId,
          currency: orgRow.currency,
          athleteId: null,
        },
      };
    },
  );

  if (step1Result.status !== "processed") {
    return step1Result as ConnectProcessResult;
  }

  // Step 2: auto-fill after the purchase has committed.
  const { autoFillParams } = step1Result;
  const fillResult = await autoFillCredits({
    organizationId: orgId,
    ...autoFillParams,
  });

  log.info("package_purchase: auto-fill complete", {
    event: event.id,
    settled: fillResult.settled,
    filled: fillResult.filled,
    skipped: fillResult.skipped.size,
  });

  return { status: "processed" };
}

/**
 * Process a subscription initial checkout (F12d, purchaseKind = "subscription_initial").
 *
 * Creates or updates `client_subscription`. Does NOT issue credits — that
 * is the responsibility of `processSubscriptionInvoice` (invoice.paid),
 * because Stripe delivers the first invoice as a separate event. This split
 * also handles the edge case where `invoice.paid` arrives before this event.
 *
 * Steps:
 *   1. Idempotency via webhook_event marker
 *   2. Upsert client_stripe_customer (belt-and-suspenders — should exist from checkout)
 *   3. Upsert client_subscription by stripeSubscriptionId
 */
async function processSubscriptionInitial(
  event: ConnectPaymentEvent,
): Promise<ConnectProcessResult> {
  const orgId = event.metadata.organizationId;
  const clientId = event.metadata.clientId;
  const productTemplateId = event.metadata.productTemplateId;
  const subscriptionId = event.subscriptionId;

  if (!orgId || !clientId || !productTemplateId || !subscriptionId) {
    log.warn("ignoring subscription_initial event with incomplete metadata", {
      event: event.id,
      hasOrgId: !!orgId,
      hasClientId: !!clientId,
      hasTemplate: !!productTemplateId,
      hasSubId: !!subscriptionId,
    });
    return { status: "unknown_account" };
  }

  return withSystemBypass(
    "subscription_initial webhook — no user session, RLS does not apply",
    async (tx) => {
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: orgId,
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate subscription_initial event", { event: event.id });
        return { status: "duplicate" as const };
      }

      // Belt-and-suspenders upsert of the Stripe customer mapping. It was
      // created during checkout, but the webhook runner cannot assume that
      // step committed before the webhook fired.
      const [csc] = await tx
        .select({ id: clientStripeCustomer.id })
        .from(clientStripeCustomer)
        .where(
          and(
            eq(clientStripeCustomer.organizationId, orgId),
            eq(clientStripeCustomer.clientId, clientId),
          ),
        )
        .limit(1);
      if (!csc) {
        log.warn("subscription_initial: no client_stripe_customer row found", {
          event: event.id,
          orgId,
          clientId,
        });
      }

      // Upsert by stripeSubscriptionId — the shared key that both
      // processSubscriptionInitial and processSubscriptionInvoice use.
      await tx
        .insert(clientSubscription)
        .values({
          organizationId: orgId,
          clientId,
          productTemplateId,
          stripeSubscriptionId: subscriptionId,
          status: "active",
        })
        .onConflictDoUpdate({
          target: [clientSubscription.stripeSubscriptionId],
          set: {
            status: "active",
            clientId,
            productTemplateId,
            updatedAt: new Date(),
          },
        });

      log.info("subscription_initial: client_subscription upserted", {
        event: event.id,
        subscriptionId,
        clientId,
      });

      return { status: "processed" as const };
    },
  );
}

/**
 * Process a Connect subscription lifecycle event (F12d).
 *
 * Dispatches to the correct sub-handler based on event.type:
 *   - "invoice.paid" → issue renewal credits + auto-fill
 *   - "invoice.payment_failed" → mark past_due + notify
 *   - "customer.subscription.deleted" → mark canceled
 */
export async function processConnectSubscriptionEvent(
  event: ConnectSubscriptionEvent,
): Promise<ConnectProcessResult> {
  switch (event.type) {
    case "invoice.paid":
      return processSubscriptionInvoice(event);
    case "invoice.payment_failed":
      return processSubscriptionFailed(event);
    case "customer.subscription.deleted":
      return processSubscriptionDeleted(event);
    default:
      log.warn("ignoring unknown subscription event type", {
        event: event.id,
        type: (event as { type: string }).type,
      });
      return { status: "unknown_account" };
  }
}

/**
 * Resolve a client (parent) from the Stripe customer id on the Connected
 * Account. Returns `{ clientId, clientEmail, orgId }` or null.
 */
async function resolveClientFromStripeCustomer(
  tx: TenantDb,
  stripeCustomerId: string,
): Promise<{ clientId: string; clientEmail: string; orgId: string } | null> {
  const [row] = await tx
    .select({
      clientId: clientStripeCustomer.clientId,
      orgId: clientStripeCustomer.organizationId,
    })
    .from(clientStripeCustomer)
    .where(eq(clientStripeCustomer.stripeCustomerId, stripeCustomerId))
    .limit(1);
  if (!row) return null;

  const [parent] = await tx
    .select({ email: client.email })
    .from(client)
    .where(and(eq(client.id, row.clientId), eq(client.organizationId, row.orgId)))
    .limit(1);
  if (!parent) return null;

  return { clientId: row.clientId, clientEmail: parent.email, orgId: row.orgId };
}

/**
 * Process a subscription renewal invoice (invoice.paid, F12d).
 *
 * Two steps, two transactions (same pattern as processPackagePurchase):
 *   1. Idempotency + resolve client + find-or-create credit_purchase + issue credits
 *   2. Auto-fill (per-booking mini-transactions)
 *
 * REGUŁA (podfaza e): Ten handler NIGDY nie sprawdza
 * allowed_purchase_modes/allowed_billing_types ANI is_active template'a.
 * Subskrypcja odnawia się niezależnie od późniejszej zmiany polityki
 * (US-23.6/AC1, AC7, F12e). Dezaktywacja template'a blokuje tylko nowe
 * zakupy, nigdy odnowienia — AC7.
 *
 * Find-or-create for client_subscription: Stripe does not guarantee ordering.
 * invoice.paid may arrive before checkout.session.completed, so we do
 * INSERT ... ON CONFLICT DO NOTHING followed by UPDATE, converging to the
 * same record regardless of arrival order.
 */
async function processSubscriptionInvoice(
  event: ConnectSubscriptionEvent,
): Promise<ConnectProcessResult> {
  const { stripeSubscriptionId, stripeCustomerId } = event;

  // Step 1: idempotency + purchase + credits in one transaction.
  const step1Result = await withSystemBypass(
    "subscription invoice webhook — no user session, RLS does not apply",
    async (tx) => {
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: "00000000-0000-0000-0000-000000000000",
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate subscription invoice event", { event: event.id });
        return { status: "duplicate" as const };
      }

      // Resolve client from the Stripe customer on the Connected Account.
      const resolved = await resolveClientFromStripeCustomer(tx, stripeCustomerId);
      if (!resolved) {
        log.error("invoice.paid: cannot resolve client from stripeCustomerId", {
          event: event.id,
          stripeCustomerId,
        });
        return { status: "unknown_account" as const };
      }
      const { clientId, clientEmail, orgId } = resolved;

      // Find-or-create client_subscription. invoice.paid may arrive before
      // checkout.session.completed, in which case there is no row yet.
      const [existingSub] = await tx
        .select({
          id: clientSubscription.id,
          productTemplateId: clientSubscription.productTemplateId,
          clientId: clientSubscription.clientId,
        })
        .from(clientSubscription)
        .where(eq(clientSubscription.stripeSubscriptionId, stripeSubscriptionId))
        .limit(1);

      if (!existingSub) {
        // Fallback: create a placeholder row. We know the client but not
        // the template — that gets filled in when processSubscriptionInitial
        // runs (or a later webhook).
        log.warn("invoice.paid before checkout.session.completed — creating placeholder", {
          event: event.id,
          stripeSubscriptionId,
          clientId,
        });
        await tx
          .insert(clientSubscription)
          .values({
            organizationId: orgId,
            clientId,
            productTemplateId: "00000000-0000-0000-0000-000000000000",
            stripeSubscriptionId,
            status: "active",
          })
          .onConflictDoUpdate({
            target: [clientSubscription.stripeSubscriptionId],
            set: { status: "active", updatedAt: new Date() },
          });
      } else {
        // Update status to active (may have been past_due).
        await tx
          .update(clientSubscription)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(clientSubscription.stripeSubscriptionId, stripeSubscriptionId));
      }

      // Resolve product template — prefers the existing row, falls back to
      // any active recurring template in the org.
      const templateId = existingSub?.productTemplateId;
      let creditTypeId: string | null = null;
      let quantity: number = 1;

      if (templateId && templateId !== "00000000-0000-0000-0000-000000000000") {
        const [tmpl] = await tx
          .select({
            creditTypeId: productTemplate.creditTypeId,
            creditQuantity: productTemplate.creditQuantity,
          })
          .from(productTemplate)
          .where(
            and(
              eq(productTemplate.id, templateId),
              eq(productTemplate.organizationId, orgId),
            ),
          )
          .limit(1);
        if (tmpl) {
          creditTypeId = tmpl.creditTypeId;
          quantity = tmpl.creditQuantity;
        }
      }

      if (!creditTypeId) {
        log.error("invoice.paid: cannot resolve credit type from template", {
          event: event.id,
          templateId,
        });
        return { status: "unknown_account" as const };
      }

      // Resolve org timezone.
      const [orgRow] = await tx
        .select({ timezone: organization.timezone })
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1);
      const timeZone = orgRow?.timezone ?? "UTC";

      // Insert credit_purchase.
      const [purchase] = await tx
        .insert(creditPurchase)
        .values({
          organizationId: orgId,
          clientId,
          productTemplateId: templateId!,
          athleteId: null,
          quantity,
          paymentMethod: "subscription",
          clientSubscriptionId: existingSub?.id ?? null,
        })
        .returning({ id: creditPurchase.id });
      if (!purchase) {
        throw new Error("processSubscriptionInvoice: credit_purchase insert returned no row");
      }

      // Issue credits with source "subscription_renewal".
      const issued = await issueCredits(tx, {
        organizationId: orgId,
        clientId,
        creditTypeId,
        athleteId: null,
        quantity,
        source: "subscription_renewal",
        timeZone,
        creditPurchaseId: purchase.id,
      });

      log.info("subscription invoice: credits issued", {
        event: event.id,
        purchaseId: purchase.id,
        clientId,
        credits: issued.length,
      });

      return {
        status: "processed" as const,
        organizationId: orgId,
        autoFillParams: {
          clientId,
          clientEmail,
          creditTypeId,
          currency: event.currency ?? "pln",
          athleteId: null,
        },
      };
    },
  );

  if (step1Result.status !== "processed") {
    return step1Result as ConnectProcessResult;
  }

  // Step 2: auto-fill after the purchase has committed.
  const { autoFillParams, organizationId } = step1Result;
  await autoFillCredits({
    organizationId,
    ...autoFillParams,
  });

  return { status: "processed" };
}

/**
 * Process a subscription payment failure (invoice.payment_failed, F12d).
 *
 * Marks the subscription as past_due and sends an email to the client with
 * a link to the Customer Portal when configured, or a "contact the academy"
 * message when portalConfigured is false.
 */
async function processSubscriptionFailed(
  event: ConnectSubscriptionEvent,
): Promise<ConnectProcessResult> {
  const { stripeSubscriptionId, stripeCustomerId } = event;

  return withSystemBypass(
    "subscription failed webhook — no user session, RLS does not apply",
    async (tx) => {
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: "00000000-0000-0000-0000-000000000000",
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate subscription failed event", { event: event.id });
        return { status: "duplicate" as const };
      }

      const [sub] = await tx
        .update(clientSubscription)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(clientSubscription.stripeSubscriptionId, stripeSubscriptionId))
        .returning({ id: clientSubscription.id, organizationId: clientSubscription.organizationId, clientId: clientSubscription.clientId });
      if (!sub) {
        log.warn("invoice.payment_failed for unknown subscription", {
          event: event.id,
          stripeSubscriptionId,
        });
        return { status: "unknown_account" };
      }

      // Resolve org's portalConfigured flag.
      const [orgRow] = await tx
        .select({
          portalConfigured: organization.portalConfigured,
          name: organization.name,
        })
        .from(organization)
        .where(eq(organization.id, sub.organizationId))
        .limit(1);

      // Resolve client email.
      const [parent] = await tx
        .select({ email: client.email, name: client.name })
        .from(client)
        .where(and(eq(client.id, sub.clientId), eq(client.organizationId, sub.organizationId)))
        .limit(1);

      log.info("subscription failed: marked past_due", {
        event: event.id,
        stripeSubscriptionId,
        orgId: sub.organizationId,
      });

      return {
        status: "processed" as const,
        clientEmail: parent?.email ?? null,
        clientName: parent?.name ?? null,
        clientId: sub.clientId,
        organizationId: sub.organizationId,
        orgName: orgRow?.name ?? "",
        portalConfigured: orgRow?.portalConfigured ?? false,
        stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        eventId: event.id,
      };
    },
  ).then(async (result) => {
    if (result.status !== "processed") return result as ConnectProcessResult;
    if (!result.clientEmail || !result.clientId) return { status: "processed" } as ConnectProcessResult;

    const portalUrl = result.portalConfigured
      ? await billing.createConnectPortalSession({
          providerCustomerId: result.stripeCustomerId,
          returnUrl: `${clientEnv.NEXT_PUBLIC_APP_URL}/moje-zajecia`,
        }).then((r) => (r.ok ? r.url : ""))
      : "";

    await emitDomainNotification(db, {
      eventType: "subscription-payment-failed",
      organizationId: result.organizationId,
      accountId: null,
      recipients: [{
        kind: "client",
        clientId: result.clientId,
        email: result.clientEmail,
        name: result.clientName || undefined,
        locale: "pl",
      }],
      params: {
        orgName: result.orgName,
        ...(portalUrl ? { portalUrl } : {}),
      },
      link: portalUrl || undefined,
      dedupeBasis: `subscription-payment-failed:${result.eventId}`,
    });

    return { status: "processed" } as ConnectProcessResult;
  });
}

/**
 * Process a subscription cancellation (customer.subscription.deleted, F12d).
 *
 * Marks the subscription as canceled. Existing credits are NOT revoked.
 */
async function processSubscriptionDeleted(
  event: ConnectSubscriptionEvent,
): Promise<ConnectProcessResult> {
  const { stripeSubscriptionId } = event;

  return withSystemBypass(
    "subscription deleted webhook — no user session, RLS does not apply",
    async (tx) => {
      const [marker] = await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId: "00000000-0000-0000-0000-000000000000",
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
        })
        .returning({ id: webhookEvent.id });

      if (!marker) {
        log.info("duplicate subscription deleted event", { event: event.id });
        return { status: "duplicate" as const };
      }

      const [updated] = await tx
        .update(clientSubscription)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(clientSubscription.stripeSubscriptionId, stripeSubscriptionId))
        .returning({ id: clientSubscription.id });

      if (!updated) {
        log.warn("customer.subscription.deleted for unknown subscription", {
          event: event.id,
          stripeSubscriptionId,
        });
      } else {
        log.info("subscription deleted: marked canceled", {
          event: event.id,
          stripeSubscriptionId,
        });
      }

      return { status: "processed" as const };
    },
  );
}
