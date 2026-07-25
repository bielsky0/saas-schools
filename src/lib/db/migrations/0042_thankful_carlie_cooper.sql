CREATE TABLE "client_price_override" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"clientId" text NOT NULL,
	"groupTypeId" text,
	"overrideType" text NOT NULL,
	"value" integer NOT NULL,
	"validFrom" date NOT NULL,
	"validUntil" date,
	"reason" text NOT NULL,
	"grantedByUserId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_price_override" ADD CONSTRAINT "client_price_override_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_price_override" ADD CONSTRAINT "client_price_override_grantedByUserId_user_id_fk" FOREIGN KEY ("grantedByUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_price_override" ADD CONSTRAINT "client_price_override_client_fk" FOREIGN KEY ("clientId","organizationId") REFERENCES "public"."client"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_price_override" ADD CONSTRAINT "client_price_override_group_type_fk" FOREIGN KEY ("groupTypeId","organizationId") REFERENCES "public"."group_type"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_price_override_active_uq" ON "client_price_override" USING btree ("organizationId","clientId","groupTypeId") NULLS NOT DISTINCT WHERE "isActive" = true;--> statement-breakpoint
CREATE INDEX "client_price_override_org_idx" ON "client_price_override" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "client_price_override_client_idx" ON "client_price_override" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "client_price_override_active_idx" ON "client_price_override" USING btree ("isActive");