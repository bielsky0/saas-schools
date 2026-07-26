--
-- Faza 28 — Lesson topics and homework tracking (langlion §2.42, EPIK 43).
--
-- Three additive tables: lesson_topic (one per session), homework (multiple
-- per session), homework_completion (per athlete per homework).
-- No modification of booking → does not touch EXCLUDE §5.3.
-- Constraint 18: unique (homework_id, athlete_id) on homework_completion.
--
-- ON DELETE decisions:
--   session_id → RESTRICT (can't delete a session with lesson log attached)
--   homework_id in completion → CASCADE (completion is meaningless without parent)
--   athlete_id in completion → CASCADE
--   created_by_user_id / marked_by_user_id → RESTRICT (staff users are soft-deleted only)
--
CREATE TABLE "lesson_topic" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "session_id" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "lesson_topic_id_org_uq" UNIQUE("id","organization_id"),
  CONSTRAINT "lesson_topic_session_uq" UNIQUE("session_id","organization_id")
);
--> statement-breakpoint

CREATE TABLE "homework" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "session_id" text NOT NULL,
  "description" text NOT NULL,
  "due_date" text,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "homework_id_org_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint

CREATE TABLE "homework_completion" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "homework_id" text NOT NULL,
  "athlete_id" text NOT NULL,
  "status" text DEFAULT 'not_done' NOT NULL,
  "marked_by_user_id" text NOT NULL,
  "marked_at" timestamp,
  "completed_by_actor_type" text DEFAULT 'staff' NOT NULL,
  CONSTRAINT "homework_completion_id_org_uq" UNIQUE("id","organization_id"),
  CONSTRAINT "homework_completion_hw_athlete_uq" UNIQUE("homework_id","athlete_id")
);
--> statement-breakpoint

ALTER TABLE "lesson_topic" ADD CONSTRAINT "lesson_topic_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "lesson_topic" ADD CONSTRAINT "lesson_topic_session_fk"
  FOREIGN KEY ("session_id","organization_id") REFERENCES "public"."class_session"("id","organizationId")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "lesson_topic" ADD CONSTRAINT "lesson_topic_created_by_user_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework" ADD CONSTRAINT "homework_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework" ADD CONSTRAINT "homework_session_fk"
  FOREIGN KEY ("session_id","organization_id") REFERENCES "public"."class_session"("id","organizationId")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework" ADD CONSTRAINT "homework_created_by_user_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework_completion" ADD CONSTRAINT "homework_completion_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework_completion" ADD CONSTRAINT "homework_completion_homework_fk"
  FOREIGN KEY ("homework_id","organization_id") REFERENCES "public"."homework"("id","organization_id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework_completion" ADD CONSTRAINT "homework_completion_athlete_fk"
  FOREIGN KEY ("athlete_id","organization_id") REFERENCES "public"."athlete"("id","organizationId")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "homework_completion" ADD CONSTRAINT "homework_completion_marked_by_user_fk"
  FOREIGN KEY ("marked_by_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "lesson_topic_org_idx" ON "lesson_topic" USING btree ("organization_id");
--> statement-breakpoint

CREATE INDEX "lesson_topic_session_idx" ON "lesson_topic" USING btree ("session_id");
--> statement-breakpoint

CREATE INDEX "homework_org_idx" ON "homework" USING btree ("organization_id");
--> statement-breakpoint

CREATE INDEX "homework_session_idx" ON "homework" USING btree ("session_id");
--> statement-breakpoint

CREATE INDEX "homework_completion_org_idx" ON "homework_completion" USING btree ("organization_id");
--> statement-breakpoint

CREATE INDEX "homework_completion_homework_idx" ON "homework_completion" USING btree ("homework_id");
--> statement-breakpoint

CREATE INDEX "homework_completion_athlete_idx" ON "homework_completion" USING btree ("athlete_id");
