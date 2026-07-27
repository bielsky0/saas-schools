--> HAND-WRITTEN (Faza 35 — SMS default channels for transactional events).
-->
--> Add 'sms' to default_channels for time-sensitive events where SMS has
--> a clear advantage over email (immediate visibility).
-->
--> Start set: session-cancelled, payment-failed.
--> Intentionaly narrow — SMS is a paid/limited resource per org, unlike email.
--> Future expansion: add rows here without schema migration.
--> statement-breakpoint
UPDATE notification_event_type
SET default_channels = array_append(default_channels, 'sms')
WHERE code IN ('session-cancelled', 'payment-failed')
  AND NOT (default_channels @> ARRAY['sms']);
