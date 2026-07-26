import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { classSession } from "./class-sessions";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Lesson topic — structured "what was covered today" for the whole session,
 * not per-participant (Faza 28, §2.42, EPIK 43).
 *
 * One row per session: the same trainer can overwrite it later (create+
 * onConflictDoUpdate at the data layer). Separate from grades/progress notes
 * (EPIK 35) — shares the session roster page as carrier (§16.1).
 *
 * Append-only log: no DELETE. Overwrite = UPDATE in-place.
 * No audit on UPDATE — only on first creation (§2.42).
 */
export const lessonTopic = pgTable(
  "lesson_topic",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("lesson_topic_id_org_uq").on(t.id, t.organizationId),
    unique("lesson_topic_session_uq").on(t.sessionId, t.organizationId),
    foreignKey({
      columns: [t.sessionId, t.organizationId],
      foreignColumns: [classSession.id, classSession.organizationId],
      name: "lesson_topic_session_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.createdByUserId],
      foreignColumns: [user.id],
      name: "lesson_topic_created_by_user_fk",
    }).onDelete("restrict"),
    index("lesson_topic_org_idx").on(t.organizationId),
    index("lesson_topic_session_idx").on(t.sessionId),
  ],
);

/**
 * Homework assigned to the whole group in the context of a session.
 * Completion is per-athlete (homework_completion) — this row is the
 * assignment itself (Faza 28, §2.42, EPIK 43).
 *
 * Multiple homework entries per session. Editable by id. Append-only:
 * no DELETE. No audit on UPDATE — only on first creation.
 */
export const homework = pgTable(
  "homework",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    description: text("description").notNull(),
    dueDate: text("due_date"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("homework_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.sessionId, t.organizationId],
      foreignColumns: [classSession.id, classSession.organizationId],
      name: "homework_session_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.createdByUserId],
      foreignColumns: [user.id],
      name: "homework_created_by_user_fk",
    }).onDelete("restrict"),
    index("homework_org_idx").on(t.organizationId),
    index("homework_session_idx").on(t.sessionId),
  ],
);

/**
 * Per-athlete homework completion status — completely independent axis
 * from attendance_status and payment_status (Constraint 18, Faza 28,
 * §2.42, EPIK 43).
 *
 * Marked by STAFF only in this version (Rozstrzygnięcie #31);
 * completed_by_actor_type column reserved for future parent self-service.
 * UPSERT on (homework_id, athlete_id).
 */
export const homeworkCompletion = pgTable(
  "homework_completion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    homeworkId: text("homework_id").notNull(),
    athleteId: text("athlete_id").notNull(),
    status: text("status")
      .$type<"not_done" | "done">()
      .notNull()
      .default("not_done"),
    markedByUserId: text("marked_by_user_id").notNull(),
    markedAt: timestamp("marked_at"),
    completedByActorType: text("completed_by_actor_type")
      .$type<"staff" | "client">()
      .notNull()
      .default("staff"),
  },
  (t) => [
    unique("homework_completion_id_org_uq").on(t.id, t.organizationId),
    unique("homework_completion_hw_athlete_uq").on(t.homeworkId, t.athleteId),
    foreignKey({
      columns: [t.homeworkId, t.organizationId],
      foreignColumns: [homework.id, homework.organizationId],
      name: "homework_completion_homework_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "homework_completion_athlete_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.markedByUserId],
      foreignColumns: [user.id],
      name: "homework_completion_marked_by_user_fk",
    }).onDelete("restrict"),
    index("homework_completion_org_idx").on(t.organizationId),
    index("homework_completion_homework_idx").on(t.homeworkId),
    index("homework_completion_athlete_idx").on(t.athleteId),
  ],
);
