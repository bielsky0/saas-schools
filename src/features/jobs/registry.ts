import type { JobRegistry } from "@/lib/adapters/jobs";
import { billingNotifyHandler } from "@/features/billing/notify";
import { creditsExpireHandler } from "@/features/credits/expire";
import { emailSendHandler } from "@/features/emails/handler";
import { notificationCreateHandler } from "@/features/notifications/handler";
import { onboardingStepHandler } from "@/features/onboarding/handler";
import { rateLimitPruneHandler } from "@/features/rate-limit/handler";
import { sessionsGenerateHandler } from "@/features/schedule/generate";
import { storagePurgeHandler } from "@/features/storage/purge";
import { groupChangesExpireHandler } from "@/features/bookings/change-group-expire";
import { refundsRecoverHandler } from "@/features/credits/refund-recover";
import { pricingSyncSubscriptionHandler, pricingDeactivateExpiredHandler } from "@/features/pricing/handler";
import { releaseExpiredPendingHandler } from "@/features/bookings/release-expired";
import { waitlistExpireHandler } from "@/features/bookings/waitlist-expire";
import { jobPruneHandler } from "./handler";

/**
 * The job name → handler map (spec 12).
 *
 * The ONE place features are wired to the queue. The adapter takes this as a
 * parameter rather than importing it, because an adapter importing feature code
 * would be a cycle.
 *
 * `JobRegistry` is `Record<JobName, _>`, so adding a name in the contract without
 * a handler here is a compile error rather than a job that dead-letters at 3am
 * with "No handler registered".
 *
 * Imported lazily by `./runner.ts` — see the note there about the module cycle
 * this file sits in the middle of.
 */
export const registry: JobRegistry = {
  "email.send": emailSendHandler,
  "onboarding.step": onboardingStepHandler,
  "billing.notify": billingNotifyHandler,
  "notification.create": notificationCreateHandler,
  "job.prune": jobPruneHandler,
  "storage.purge": storagePurgeHandler,
  "ratelimit.prune": rateLimitPruneHandler,
  "sessions.generate": sessionsGenerateHandler,
  "credits.expire": creditsExpireHandler,
  "group_changes.expire": groupChangesExpireHandler,
  "refunds.recover": refundsRecoverHandler,
  "pricing.sync_subscription_price": pricingSyncSubscriptionHandler,
  "pricing.deactivate_expired_overrides": pricingDeactivateExpiredHandler,
  "bookings.release_expired_pending": releaseExpiredPendingHandler,
  "waitlist.expire_offers": waitlistExpireHandler,
};
