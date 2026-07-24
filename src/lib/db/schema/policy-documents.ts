import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { client } from "./clients";
import { file } from "./files";
import { groupType } from "./group-types";
import { organization } from "./organizations";

export const policyDocument = pgTable(
  "policy_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    file_id: text("file_id")
      .notNull()
      .references(() => file.id, { onDelete: "restrict" }),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"),
  },
  (t) => [
    unique("policy_document_id_org_uq").on(t.id, t.organizationId),
    index("policy_document_org_idx").on(t.organizationId),
  ],
);

export const policyAcceptance = pgTable(
  "policy_acceptance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    groupTypeId: text("group_type_id").notNull(),
    policyDocumentId: text("policy_document_id").notNull(),
    policyDocumentVersion: integer("policy_document_version").notNull(),
    acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
  },
  (t) => [
    unique("policy_acceptance_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "policy_acceptance_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.groupTypeId, t.organizationId],
      foreignColumns: [groupType.id, groupType.organizationId],
      name: "policy_acceptance_group_type_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.policyDocumentId, t.organizationId],
      foreignColumns: [policyDocument.id, policyDocument.organizationId],
      name: "policy_acceptance_policy_document_fk",
    }).onDelete("restrict"),
    index("policy_acceptance_org_idx").on(t.organizationId),
    index("policy_acceptance_client_idx").on(t.clientId),
    index("policy_acceptance_group_type_idx").on(t.groupTypeId),
  ],
);
