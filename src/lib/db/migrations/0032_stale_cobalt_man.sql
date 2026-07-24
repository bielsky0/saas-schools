CREATE TABLE "notification_event_type" (
	"code" text PRIMARY KEY NOT NULL,
	"default_channels" text[] DEFAULT '{"email","in_app"}' NOT NULL,
	"is_overridable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "recipient_type" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "recipient_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "channel_sent" text[];--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "recipient_type" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "recipient_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_event_type_notification_event_type_code_fk" FOREIGN KEY ("event_type") REFERENCES "public"."notification_event_type"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_event_type_notification_event_type_code_fk" FOREIGN KEY ("event_type") REFERENCES "public"."notification_event_type"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_recipient_idx" ON "notification" USING btree ("recipient_type","recipient_id");
--> statement-breakpoint
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable") VALUES
  ('verify-email', '{"in_app"}', true),
  ('invitation', '{"email","in_app"}', true),
  ('payment-failed', '{"email","in_app"}', false),
  ('subscription-confirmed', '{"email","in_app"}', true),
  ('password-reset', '{"email"}', true),
  ('client-otp', '{"email"}', false),
  ('grade-recorded', '{"email","in_app"}', true),
  ('progress-note-added', '{"email","in_app"}', true),
  ('booking-cancelled', '{"email","in_app"}', true),
  ('session-cancelled', '{"email","in_app"}', true),
  ('plan_limit_approaching', '{"email","in_app"}', false),
  ('plan_limit_reached', '{"email","in_app"}', false),
  ('stripe_connect_requires_attention', '{"email","in_app"}', false),
  ('subscription-payment-failed', '{"email","in_app"}', false),
  ('refund-confirmed', '{"email","in_app"}', false),
  ('credit-expiring-soon', '{"email","in_app"}', true),
  ('group-change-approved', '{"email","in_app"}', true),
  ('client-password-changed', '{"email","in_app"}', false)
ON CONFLICT ("code") DO NOTHING;