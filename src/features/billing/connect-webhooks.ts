import { and, eq } from "drizzle-orm";

import type { ConnectAccountEvent, ConnectPaymentEvent } from "@/lib/adapters/billing";
import { booking, classSession, creditType, groupType, organization, webhookEvent } from "@/lib/db/schema";
import { athlete } from "@/lib/db/schema";
import { credit } from "@/lib/db/schema";
import { withSystemBypass } from "@/lib/db/system";
import { createLogger } from "@/lib/logger";
import { issueCredits } from "@/features/credits/issue";
import { spendCredit } from "@/features/credits/consume";
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
export async function processConnectPaymentEvent(
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
