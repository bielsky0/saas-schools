-- HAND-WRITTEN (mvp-plan Faza 5.3 — webhook retry monitoring & health panel).
--
-- Extends `webhook_event` from a pure idempotency-ledger row into a delivery
-- record the monitor job and the billing-page health panel can read:
--
--   status         — processed | failed | dead   (default 'processed', because
--                    every existing row WAS fully processed — a marker is only
--                    ever inserted once the state change it authorizes committed).
--   attemptCount   — deliveries attempted for this event (default 1).
--   lastError      — human-readable reason from the most recent failure.
--   lastAttemptAt  — when the last delivery attempt ran.
--   payload        — the neutral ConnectEvent jsonb, captured on failure so the
--                    monitor job can replay the event without a Stripe fetch
--                    (offline HMAC test mode has no dashboard to re-send from).
--
-- The index drives the monitor sweep: terms query is "status = 'failed' AND
-- last_attempt_at < now() - interval", a single predicate per plan step.

BEGIN;--> statement-breakpoint

ALTER TABLE "webhook_event" ADD COLUMN "status" text NOT NULL DEFAULT 'processed';--> statement-breakpoint

ALTER TABLE "webhook_event" ADD COLUMN "attemptCount" integer NOT NULL DEFAULT 1;--> statement-breakpoint

ALTER TABLE "webhook_event" ADD COLUMN "lastError" text;--> statement-breakpoint

ALTER TABLE "webhook_event" ADD COLUMN "lastAttemptAt" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "webhook_event" ADD COLUMN "payload" jsonb;--> statement-breakpoint

COMMENT ON COLUMN "webhook_event"."status" IS
  'processed | failed | dead — failed/dead set by the connect webhook route and advanced by webhooks.monitor-stuck (Faza 5.3).';--> statement-breakpoint

COMMENT ON COLUMN "webhook_event"."payload" IS
  'Raw neutral ConnectEvent jsonb captured on failure, so webhooks.monitor-stuck can replay it without querying Stripe.';--> statement-breakpoint

CREATE INDEX "webhook_event_status_last_attempt_idx"
  ON "webhook_event" ("status", "lastAttemptAt");--> statement-breakpoint

COMMIT;