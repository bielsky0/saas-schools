--> HAND-WRITTEN (langlion plan Faza 23, EPIK 38, §2.36).
-->
--> Granular permission overrides per membership: grant or revoke individual
--> permissions on top of the static role map, without building custom DB-backed
--> roles. One override per (membership, permissionKey) — unique constraint
--> prevents grant + revoke of the same key, which would be self-cancelling.
-->
--> References membership(id) CASCADE: deleting a membership removes its overrides.
--> References organization(id) CASCADE: deleting an org cleans up.
--> reason is NOT NULL — every override must carry a human-readable justification,
--> enforced at the app layer (upsertPermissionOverride) AND by the schema.
CREATE TABLE "membership_permission_override" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "membershipId" text NOT NULL REFERENCES "membership"("id") ON DELETE CASCADE,
  "permissionKey" text NOT NULL,
  "overrideType" text NOT NULL,
  "reason" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX "mpo_membership_key_uq"
  ON "membership_permission_override" ("membershipId", "permissionKey");--> statement-breakpoint
CREATE INDEX "mpo_membership_idx"
  ON "membership_permission_override" ("membershipId");--> statement-breakpoint
CREATE INDEX "mpo_org_idx"
  ON "membership_permission_override" ("organizationId");
