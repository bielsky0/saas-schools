ALTER TABLE "credit_purchase" ADD COLUMN "price_paid" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD COLUMN "refund_initiated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD COLUMN "refund_variant" text;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD COLUMN "refund_confirmed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_refund_confirmed_by_fk" FOREIGN KEY ("refund_confirmed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
