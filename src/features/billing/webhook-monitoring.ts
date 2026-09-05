import { and, eq, lt, sql } from "drizzle-orm";

import type { ConnectAccountEvent, ConnectEvent, ConnectPaymentEvent, ConnectRefundEvent, ConnectSubscriptionEvent } from "@/lib/adapters/billing";
import type { JobHandler } from "@/lib/adapters/jobs";
import { clientStripeCustomer, organization, webhookEvent } from "@/lib/db/schema";
import { db } from "@/lib/db";
import type { TenantDb } from "@/lib/db/tenant";
import { withSystemBypass } from "@/lib/db/system";
import { createLogger } from "@/lib/logger";
import { processConnectWebhookEvent } from "./connect-webhooks";
import { resolveBillingRecipients } from "./data";
import { emitDomainNotification } from "@/features/notifications/emit";

const log = createLogger("billing:webhook-monitor");

/**
 * Webhook delivery monitoring & replay (Faza 5.3).
 *
 * The webhook route is UNAUTHENTICATED by design — HMAC is the auth. When a
 * verified event's processing throws, the state change it would have caused
 * rolled back with the marker, so Stripe's own retry would reprocess cleanly.
 * That is correct but invisible: nothing recorded the failure. These columns on
 * `webhook_event` (migration 0082) are that record, and `webhooks.monitor-stuck`
 * is the sweep that turns repeated failures into a replay + an alert.
 *
 * ── WHY THE FAILURE MARKER IS NOT A DEDUPE BUG ────────────────────────────
 *
 * `webhook_event` carries `unique(provider, providerEventId)`, and the
 * processors insert their marker with ON CONFLICT DO NOTHING — so a leftover
 * `failed` row would make the replay return "duplicate" WITHOUT doing the work.
 * The monitor therefore DELETES the failed row before replaying: a successful
 * replay re-inserts a fresh `processed` marker in its own transaction, and a
 * failed one is re-recorded by the same path as the route. There is never a
 * period where a stuck row is ALSO the blocker that proves it stuck.
 */

/** Deliveries before we stop re-running an event. */
export const WEBHOOK_MAX_ATTEMPTS = 3;
/** An event is "stuck" once this long has passed since its last attempt. */
export const WEBHOOK_STUCK_CUTOFF_MS = 10 * 60_000;

/**
 * Best-effort tenant resolution for a Connect event — the owner of the failed
 * marker. A payment/group_change/extra_fee event names its org in metadata; an
 * account/refund event names nothing but maps through the Connect account id;
 * a subscription event maps through the Stripe customer → client_stripe_customer.
 *
 * Returns null when unresolvable (unknown account, unknown customer, no
 * metadata) — the same conditions under which the processors return
 * `unknown_account` rather than throw, so the marker write is skipped and the
 * log line carries the event.
 */
async function resolveEventOrgId(
  tx: TenantDb,
  event: ConnectEvent,
): Promise<string | null> {
  if (event.type === "checkout.session.completed") {
    const orgId = (event as ConnectPaymentEvent).metadata.organizationId;
    return orgId ?? null;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed" || event.type === "customer.subscription.deleted") {
    const stripeCustomerId = (event as ConnectSubscriptionEvent).stripeCustomerId;
    const [csc] = await tx
      .select({ organizationId: clientStripeCustomer.organizationId })
      .from(clientStripeCustomer)
      .where(eq(clientStripeCustomer.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return csc?.organizationId ?? null;
  }

  // account.updated / account.application.deauthorized / charge.refunded
  const [org] = await tx
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeConnectAccountId, (event as ConnectAccountEvent | ConnectRefundEvent).accountId))
    .limit(1);
  return org?.id ?? null;
}

/**
 * Record (or advance) a failed-delivery marker for a Connect event.
 *
 * Called from the webhook route's catch and from the monitor's replay catch.
 * Idempotent on `(provider, providerEventId)`: repeated failures increment
 * `attemptCount`, overwrite `lastError`/`lastAttemptAt`, and refresh `payload`
 * (so the latest captured shape is what the monitor replays).
 *
 * `options.attemptCount` is the count to write on a FRESH insert. The monitor
 * passes it because it deletes the failed row BEFORE replaying (see the header
 * note), so there is no conflict row to increment — without this, a replayed
 * failure would silently reset the attempt counter to 1.
 */
export async function recordWebhookFailure(
  event: ConnectEvent,
  error: unknown,
  options?: { attemptCount?: number },
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  await withSystemBypass(
    "connect webhook failure record — owner resolved from the event, RLS does not apply to webhooks",
    async (tx) => {
      const organizationId = await resolveEventOrgId(tx, event);

      if (!organizationId) {
        log.warn("cannot record webhook failure without a resolvable org", {
          event: event.id,
          type: event.type,
        });
        return;
      }

      await tx
        .insert(webhookEvent)
        .values({
          provider: event.provider,
          providerEventId: event.id,
          type: event.type,
          organizationId,
          occurredAt: event.occurredAt,
          status: "failed",
          attemptCount: options?.attemptCount ?? 1,
          lastError: message,
          lastAttemptAt: new Date(),
          payload: event as unknown,
        })
        .onConflictDoUpdate({
          target: [webhookEvent.provider, webhookEvent.providerEventId],
          set: {
            status: "failed",
            attemptCount: sql`${webhookEvent.attemptCount} + 1`,
            lastError: message,
            lastAttemptAt: new Date(),
            payload: event as unknown,
          },
        });
    },
  );
}

/**
 * Reconstruct a neutral ConnectEvent from the stored jsonb payload.
 * jsonb round-trips `occurredAt` as an ISO string; the processors only pass it
 * through to a timestamptz column, so a string is fine, but restore the Date to
 * keep the union's shape honest on the replay path.
 */
function replayEvent(payload: unknown): ConnectEvent {
  const raw = payload as Record<string, unknown>;
  return {
    ...raw,
    occurredAt: new Date(raw.occurredAt as string),
  } as unknown as ConnectEvent;
}

/**
 * Cron sweep for stuck Connect webhook deliveries (Faza 5.3).
 *
 * Runner: `webhooks.monitor-stuck`, enqueued hourly on the jobs drain (Vercel
 * cron / sidecar pinger). For each `failed` event idle for the cutoff:
 *   1. delete the failed marker (see the dedupe note in the header),
 *   2. replay through `processConnectWebhookEvent` — byte-for-byte the work the
 *      original delivery would have done,
 *   3. on success, nothing to do — the processor's own marker committed;
 *   4. on failure, re-record via `recordWebhookFailure`. Once `attemptCount`
 *      reaches `WEBHOOK_MAX_ATTEMPTS`, dead-letter: mark `dead` and alert the
 *      org owner over email + in-app.
 */
export const webhookMonitorStuckHandler: JobHandler<"webhooks.monitor-stuck"> =
  async () => {
    const cutoff = new Date(Date.now() - WEBHOOK_STUCK_CUTOFF_MS);

    const stuck = await withSystemBypass(
      "webhooks.monitor-stuck — sweeps every tenant's failed webhooks",
      async (tx) =>
        tx
          .select({
            id: webhookEvent.id,
            providerEventId: webhookEvent.providerEventId,
            type: webhookEvent.type,
            organizationId: webhookEvent.organizationId,
            attemptCount: webhookEvent.attemptCount,
            lastError: webhookEvent.lastError,
            payload: webhookEvent.payload,
          })
          .from(webhookEvent)
          .where(
            and(
              eq(webhookEvent.status, "failed"),
              lt(webhookEvent.lastAttemptAt, cutoff),
            ),
          )
          .for("update"),
    );

    if (stuck.length === 0) return;

    for (const row of stuck) {
      if (!row.payload) {
        log.warn("failed webhook has no payload to replay — dead-lettering", {
          event: row.providerEventId,
        });
        await deadLetter(row.organizationId, row.providerEventId, row.type, row.lastError);
        continue;
      }

      const event = replayEvent(row.payload);

      // Delete the failed marker so the replay is not swallowed as a duplicate.
      await withSystemBypass(
        "webhooks.monitor-stuck — remove failed marker before replay",
        async (tx) => {
          await tx.delete(webhookEvent).where(eq(webhookEvent.id, row.id));
        },
      );

      try {
        await processConnectWebhookEvent(event);
        log.info("webhook replayed successfully", { event: row.providerEventId });
      } catch (error) {
        const nextAttempt = row.attemptCount + 1;
        log.error("webhook replay failed", {
          event: row.providerEventId,
          attempt: nextAttempt,
          error,
        });

        // Re-record the failure with the accumulated count first (the failed
        // row was deleted before replay, so this is a fresh insert — the count
        // must travel in, it cannot be read from the row). Then, if this was
        // the last allowed attempt, dead-letter the marker we just wrote.
        await recordWebhookFailure(event, error, { attemptCount: nextAttempt });

        if (nextAttempt >= WEBHOOK_MAX_ATTEMPTS) {
          await deadLetter(row.organizationId, row.providerEventId, row.type, error);
        }
      }
    }
  };

/**
 * Mark an event as permanently failed and notify the org owner.
 *
 * The `dead` row stays (it is a record for the health panel) but is excluded
 * from future sweeps by the `failed` status filter. The alert is exactly-once
 * per event via the dedupeBasis.
 */
async function deadLetter(
  organizationId: string | null,
  providerEventId: string,
  type: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  if (organizationId) {
    await withSystemBypass(
      "webhooks.monitor-stuck — mark event dead after max attempts",
      async (tx) => {
        await tx
          .update(webhookEvent)
          .set({
            status: "dead",
            lastError: message,
            lastAttemptAt: new Date(),
          })
          .where(
            and(
              eq(webhookEvent.providerEventId, providerEventId),
              eq(webhookEvent.organizationId, organizationId),
              eq(webhookEvent.status, "failed"),
            ),
          );
      },
    );

    // Fans out email + in-app to every ACTIVE OWNER (same resolution as billing
    // payment-failed). DedupeBasis = the event id, so the alert is exactly-once
    // even if the monitor job is re-claimed and re-run.
    const { ownerName, mailboxes } = await resolveBillingRecipients(organizationId, null);
    if (mailboxes.length === 0) {
      log.warn("dead-lettered event has no recipients to alert", {
        event: providerEventId,
        orgId: organizationId,
      });
      return;
    }

    await emitDomainNotification(db, {
      eventType: "webhook-dead-lettered",
      organizationId,
      accountId: null,
      recipients: mailboxes.map((box) => ({
        kind: "staff" as const,
        userId: box.userId,
        email: box.email,
        name: box.name ?? undefined,
        locale: box.locale,
      })),
      params: {
        eventId: providerEventId,
        eventType: type,
        error: message,
        orgName: ownerName,
      },
      dedupeBasis: `webhook-dead-lettered:${providerEventId}`,
    });
  } else {
    log.warn("dead-lettering unowned webhook event", {
      event: providerEventId,
      error: message,
    });
  }
}