import { boolean, foreignKey, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { client } from "./clients";
import { file } from "./files";
import { organization } from "./organizations";

/**
 * consent_document — versioned consent documents per organization (langlion §2.35, EPIK 37).
 *
 * Same versioning pattern as policy_document (F17, §2.18): editing creates a new
 * record with an incremented version and supersedes_id pointing to the old one.
 * The old record is deactivated (is_active = false). Existing athlete_consent
 * rows freeze the version that was accepted.
 *
 * Unlike policy_document which is linked via group_type.policyDocumentId,
 * consent_document lives standalone — the set of active consents per org is
 * simply WHERE is_active = true AND deleted_at IS NULL.
 *
 * file_id is nullable: consent body may be inline text (body) or a PDF (file_id).
 */
export const consentDocument = pgTable(
  "consent_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    file_id: text("file_id").references(() => file.id, { onDelete: "restrict" }),
    body: text("body"),
    version: integer("version").notNull().default(1),
    isRequiredAtSignup: boolean("is_required_at_signup").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    supersedesId: text("supersedes_id"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"),
  },
  (t) => [
    unique("consent_document_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.supersedesId, t.organizationId],
      foreignColumns: [t.id, t.organizationId],
      name: "consent_document_supersedes_fk",
    }).onDelete("set null"),
    index("consent_document_org_idx").on(t.organizationId),
  ],
);

/**
 * athlete_consent — frozen acceptance/refusal per athlete per consent version.
 *
 * Same pattern as policy_acceptance (F17, §2.18): ip_address provides legal
 * evidence, consent_document_version is frozen at acceptance time.
 *
 * Unlike policy_acceptance which is scoped per (client, group_type), this is
 * scoped per (client, athlete, consent_document) because consents are about
 * a specific child. This also means multi-child enrollment collects consents
 * per each child separately.
 *
 * Consent documents ALWAYS force re-acceptance on a version bump. Unlike
 * policy_document which respects REQUIRE_REACCEPTANCE=false (F17), health and
 * image-rights consents carry higher legal weight (GDPR, patient rights law) —
 * a stale acceptance is never acceptable for this class of document.
 */
export const athleteConsent = pgTable(
  "athlete_consent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    athleteId: text("athlete_id").notNull(),
    consentDocumentId: text("consent_document_id").notNull(),
    consentDocumentVersion: integer("consent_document_version").notNull(),
    granted: boolean("granted").notNull(),
    acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
  },
  (t) => [
    unique("athlete_consent_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "athlete_consent_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "athlete_consent_athlete_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.consentDocumentId, t.organizationId],
      foreignColumns: [consentDocument.id, consentDocument.organizationId],
      name: "athlete_consent_consent_document_fk",
    }).onDelete("restrict"),
    index("athlete_consent_org_idx").on(t.organizationId),
    index("athlete_consent_client_idx").on(t.clientId),
    index("athlete_consent_athlete_idx").on(t.athleteId),
    index("athlete_consent_consent_document_idx").on(t.consentDocumentId),
  ],
);
