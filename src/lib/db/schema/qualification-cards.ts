import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { file } from "./files";
import { groupType } from "./group-types";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Qualification card for camp/colony participants (Faza 26, §2.40, EPIK 41).
 *
 * Two-phase form required by Polish law (MEN regulation) for organizers of
 * children's camps/holiday programs. Phase 1 (parent before camp): health data,
 * allergies, medications, emergency contact. Phase 2 (leader after camp):
 * health during camp, incidents, signature.
 *
 * Linked to (group_type, athlete), not to a specific booking — the same
 * athlete on the same group_type reuses the existing row (Constraint 16:
 * unique (group_type_id, athlete_id)). This is a "living document": edits
 * update in-place, not versioned. Data from two different camp seasons
 * of the same offer go through the same card row.
 *
 * Health fields are gated behind `athlete_health.view` (§2.35), same
 * mechanism as `athlete.health_notes` — not a second parallel system.
 *
 * status: "parent_pending" | "parent_completed" | "leader_completed"
 */
export const qualificationCard = pgTable(
  "qualification_card",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    athleteId: text("athlete_id").notNull(),
    groupTypeId: text("group_type_id").notNull(),
    status: text("status")
      .$type<"parent_pending" | "parent_completed" | "leader_completed">()
      .notNull()
      .default("parent_pending"),
    /** Phase 1 — parent before camp */
    chronicConditions: text("chronic_conditions"),
    medications: text("medications"),
    allergies: text("allergies"),
    dietaryRestrictions: text("dietary_restrictions"),
    vaccinationsInfo: text("vaccinations_info"),
    parentContactDuringCamp: text("parent_contact_during_camp"),
    /** Phase 2 — leader after camp */
    healthDuringCamp: text("health_during_camp"),
    incidents: text("incidents"),
    leaderSignedAt: timestamp("leader_signed_at"),
    completedByUserId: text("completed_by_user_id"),
    fileId: text("file_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("qualification_card_id_org_uq").on(t.id, t.organizationId),
    unique("qualification_card_athlete_group_type_uq").on(t.groupTypeId, t.athleteId),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "qualification_card_athlete_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.groupTypeId, t.organizationId],
      foreignColumns: [groupType.id, groupType.organizationId],
      name: "qualification_card_group_type_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.fileId],
      foreignColumns: [file.id],
      name: "qualification_card_file_id_file_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.completedByUserId],
      foreignColumns: [user.id],
      name: "qualification_card_completed_by_user_id_user_id_fk",
    }).onDelete("set null"),
    index("qualification_card_org_idx").on(t.organizationId),
    index("qualification_card_athlete_idx").on(t.athleteId),
    index("qualification_card_group_type_idx").on(t.groupTypeId),
  ],
);
