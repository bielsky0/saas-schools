CREATE TABLE "product_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"credit_type_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"credit_quantity" integer NOT NULL,
	"billing_type" text NOT NULL,
	"stripe_price_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"interval" text,
	"interval_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_template_id_org_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "client_stripe_customer" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_stripe_customer_uq" UNIQUE("organization_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "client_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"product_template_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "client_subscription_id_org_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "credit_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"product_template_id" text NOT NULL,
	"client_subscription_id" text,
	"athlete_id" text,
	"quantity" integer NOT NULL,
	"payment_method" text NOT NULL,
	"stripe_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_purchase_id_org_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "portal_configured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_template" ADD CONSTRAINT "product_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_template" ADD CONSTRAINT "product_template_credit_type_fk" FOREIGN KEY ("credit_type_id","organization_id") REFERENCES "public"."credit_type"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stripe_customer" ADD CONSTRAINT "client_stripe_customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stripe_customer" ADD CONSTRAINT "client_stripe_customer_client_fk" FOREIGN KEY ("client_id","organization_id") REFERENCES "public"."client"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subscription" ADD CONSTRAINT "client_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subscription" ADD CONSTRAINT "client_subscription_client_fk" FOREIGN KEY ("client_id","organization_id") REFERENCES "public"."client"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subscription" ADD CONSTRAINT "client_subscription_product_template_fk" FOREIGN KEY ("product_template_id","organization_id") REFERENCES "public"."product_template"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_client_fk" FOREIGN KEY ("client_id","organization_id") REFERENCES "public"."client"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_product_template_fk" FOREIGN KEY ("product_template_id","organization_id") REFERENCES "public"."product_template"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_athlete_fk" FOREIGN KEY ("athlete_id","organization_id") REFERENCES "public"."athlete"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_client_subscription_fk" FOREIGN KEY ("client_subscription_id") REFERENCES "public"."client_subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_template_org_idx" ON "product_template" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_template_credit_type_idx" ON "product_template" USING btree ("credit_type_id");--> statement-breakpoint
CREATE INDEX "csc_org_idx" ON "client_stripe_customer" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "client_subscription_org_idx" ON "client_subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "client_subscription_client_idx" ON "client_subscription" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_org_idx" ON "credit_purchase" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_client_idx" ON "credit_purchase" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_subscription_idx" ON "credit_purchase" USING btree ("client_subscription_id");--> statement-breakpoint
ALTER TABLE "credit" ADD CONSTRAINT "credit_credit_purchase_fk" FOREIGN KEY ("creditPurchaseId") REFERENCES "public"."credit_purchase"("id") ON DELETE set null ON UPDATE no action;