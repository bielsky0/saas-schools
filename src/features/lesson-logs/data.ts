import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import {
  homework,
  homeworkCompletion,
  lessonTopic,
} from "@/lib/db/schema";

/**
 * Data access for lesson topics, homework, and homework completions
 * (Faza 28, §2.42, EPIK 43).
 */

// ── Lesson Topic ────────────────────────────────────────────────────────

export async function getLessonTopicBySession(
  tx: TenantDb,
  organizationId: string,
  sessionId: string,
) {
  const [row] = await tx
    .select({
      id: lessonTopic.id,
      title: lessonTopic.title,
      body: lessonTopic.body,
    })
    .from(lessonTopic)
    .where(
      and(
        eq(lessonTopic.organizationId, organizationId),
        eq(lessonTopic.sessionId, sessionId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createLessonTopic(
  tx: TenantDb,
  input: {
    id: string;
    organizationId: string;
    sessionId: string;
    title: string;
    body?: string;
    createdByUserId: string;
  },
): Promise<{
  id: string;
  title: string;
  body: string | null;
  wasInserted: boolean;
}> {
  const [row] = await tx
    .insert(lessonTopic)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      title: input.title,
      body: input.body ?? null,
      createdByUserId: input.createdByUserId,
    })
    .onConflictDoUpdate({
      target: [lessonTopic.sessionId, lessonTopic.organizationId],
      set: {
        title: sql`EXCLUDED.title`,
        body: sql`EXCLUDED.body`,
      },
    })
    .returning({
      id: lessonTopic.id,
      title: lessonTopic.title,
      body: lessonTopic.body,
      wasInserted: sql<boolean>`(xmax = 0)`,
    });
  return {
    id: row!.id,
    title: row!.title,
    body: row!.body,
    wasInserted: row!.wasInserted,
  };
}

export async function updateLessonTopic(
  tx: TenantDb,
  input: {
    id: string;
    organizationId: string;
    title: string;
    body?: string;
  },
) {
  const [row] = await tx
    .update(lessonTopic)
    .set({ title: input.title, body: input.body ?? null })
    .where(
      and(
        eq(lessonTopic.id, input.id),
        eq(lessonTopic.organizationId, input.organizationId),
      ),
    )
    .returning({ id: lessonTopic.id, title: lessonTopic.title, body: lessonTopic.body });
  return row ?? null;
}

// ── Homework ────────────────────────────────────────────────────────────

export async function listHomeworkBySession(
  tx: TenantDb,
  organizationId: string,
  sessionId: string,
) {
  return tx
    .select({
      id: homework.id,
      description: homework.description,
      dueDate: homework.dueDate,
      createdByUserId: homework.createdByUserId,
      createdAt: homework.createdAt,
    })
    .from(homework)
    .where(
      and(
        eq(homework.organizationId, organizationId),
        eq(homework.sessionId, sessionId),
      ),
    )
    .orderBy(homework.createdAt);
}

export async function createHomework(
  tx: TenantDb,
  input: {
    id: string;
    organizationId: string;
    sessionId: string;
    description: string;
    dueDate?: string;
    createdByUserId: string;
  },
) {
  const [row] = await tx
    .insert(homework)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      description: input.description,
      dueDate: input.dueDate ?? null,
      createdByUserId: input.createdByUserId,
    })
    .returning({
      id: homework.id,
      description: homework.description,
      dueDate: homework.dueDate,
    });
  return row!;
}

export async function updateHomework(
  tx: TenantDb,
  input: {
    id: string;
    organizationId: string;
    description: string;
    dueDate?: string;
  },
) {
  const [row] = await tx
    .update(homework)
    .set({ description: input.description, dueDate: input.dueDate ?? null })
    .where(
      and(
        eq(homework.id, input.id),
        eq(homework.organizationId, input.organizationId),
      ),
    )
    .returning({ id: homework.id, description: homework.description, dueDate: homework.dueDate });
  return row ?? null;
}

// ── Homework Completion ─────────────────────────────────────────────────

export async function upsertHomeworkCompletion(
  tx: TenantDb,
  input: {
    id: string;
    organizationId: string;
    homeworkId: string;
    athleteId: string;
    status: "done" | "not_done";
    markedByUserId: string;
    now?: Date;
  },
) {
  const markedAt = input.now ?? new Date();
  const [row] = await tx
    .insert(homeworkCompletion)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      homeworkId: input.homeworkId,
      athleteId: input.athleteId,
      status: input.status,
      markedByUserId: input.markedByUserId,
      markedAt,
      completedByActorType: "staff",
    })
    .onConflictDoUpdate({
      target: [homeworkCompletion.homeworkId, homeworkCompletion.athleteId],
      set: {
        status: sql`EXCLUDED.status`,
        markedByUserId: sql`EXCLUDED.marked_by_user_id`,
        markedAt: sql`EXCLUDED.marked_at`,
      },
    })
    .returning({
      id: homeworkCompletion.id,
      status: homeworkCompletion.status,
      wasInserted: sql<boolean>`(xmax = 0)`,
    });
  return row!;
}

export async function getCompletionMap(
  tx: TenantDb,
  organizationId: string,
  homeworkIds: string[],
): Promise<Map<string, Map<string, { id: string; status: "done" | "not_done" }>>> {
  if (homeworkIds.length === 0) return new Map();

  const rows = await tx
    .select({
      id: homeworkCompletion.id,
      homeworkId: homeworkCompletion.homeworkId,
      athleteId: homeworkCompletion.athleteId,
      status: homeworkCompletion.status,
    })
    .from(homeworkCompletion)
    .where(
      and(
        eq(homeworkCompletion.organizationId, organizationId),
        inArray(homeworkCompletion.homeworkId, homeworkIds),
      ),
    );

  const map = new Map<string, Map<string, { id: string; status: "done" | "not_done" }>>();
  for (const row of rows) {
    let inner = map.get(row.homeworkId);
    if (!inner) {
      inner = new Map();
      map.set(row.homeworkId, inner);
    }
    inner.set(row.athleteId, { id: row.id, status: row.status });
  }
  return map;
}
