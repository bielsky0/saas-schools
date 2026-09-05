-- Faza 5.3 — Connect webhook dead-letter alert (staff).
--
-- Register the `webhook-dead-lettered` event type for the alert emitted by
-- `webhooks.monitor-stuck` once a Connect webhook delivery has burned through
-- all replay attempts. Non-overridable and on both channels: a permanently
-- failing payment webhook means the org's money flow is broken, and nobody may
-- opt out of being told that (same posture as `refund-confirmed` /
-- `payment-failed`).
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable")
VALUES ('webhook-dead-lettered', '{"email","in_app"}', false)
ON CONFLICT ("code") DO NOTHING;