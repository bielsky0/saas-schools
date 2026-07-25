--> HAND-WRITTEN — drizzle-kit generated a version that dropped NULLS NOT DISTINCT
--> from client_price_override_active_uq. That clause is required for Constraint 9
--> (two academy-wide active overrides must be caught by the partial unique index).
--> This migration keeps the original index from 0042 intact.
--> statement-breakpoint
ALTER TABLE "client_subscription" ADD COLUMN "stripe_subscription_item_id" text;
