--> HAND-WRITTEN (langlion plan Faza 19, EPIK 27).
-->
--> Add invoice request/marking columns to `credit_purchase`:
-->   - `invoice_requested_at` — client requested an invoice (US-27.1)
-->   - `invoice_issued_at` — staff marked as issued (US-27.2/AC2)
-->   - `invoice_number` — free-text reference number
-->   - `invoice_issued_by_user_id` — FK to user who marked it
-->
--> These are purely administrative — they never block the purchase path
--> (US-27.3). All columns nullable because an invoice may be requested
--> without ever being issued, and vice versa (US-27.2/AC3).
--> statement-breakpoint
ALTER TABLE "credit_purchase"
  ADD COLUMN "invoice_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "credit_purchase"
  ADD COLUMN "invoice_issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "credit_purchase"
  ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "credit_purchase"
  ADD COLUMN "invoice_issued_by_user_id" text;--> statement-breakpoint
ALTER TABLE "credit_purchase"
  ADD CONSTRAINT "credit_purchase_invoice_issued_by_fk"
  FOREIGN KEY ("invoice_issued_by_user_id") REFERENCES "user"("id")
  ON DELETE SET NULL;
