import { and, eq } from "drizzle-orm";

import { recordAudit, type AuditActor } from "@/features/admin/audit";
import { emitDomainNotification } from "@/features/notifications/emit";
import type { Locale } from "@/lib/i18n";
import { athlete, booking, classSession, client } from "@/lib/db/schema";
import type { Role } from "@/features/rbac";
import type { TenantDb } from "@/lib/db/tenant";
import {
  createHomework as createHomeworkData,
  createLessonTopic,
  upsertHomeworkCompletion,
} from "./data";
import { homework } from "@/lib/db/schema";

/**
 * Lesson log domain logic (Faza 28, §2.42, EPIK 43).
 *
 * "OWN SESSIONS ONLY" FOR A TRAINER, same enforcement shape as
 * `features/grades/enter.ts`: compare `classSession.trainerId` to the
 * caller, here rather than in the RBAC map.
 *
 * E-MAIL-FIRST (Rozstrzygnięcie #24): audit + notification in the SAME
 * transaction as the write (Rule A).
 */

export class SessionNotFoundError extends Error {}
export class ForeignSessionError extends Error {}

interface SessionContext {
  trainerId: string | null;
  sessionStart: Date;
  sessionId: string;
  organizationId: string;
}

async function loadSessionAndAssertOwnership(
  tx: TenantDb,
  organizationId: string,
  sessionId: string,
  guard: { callerRole: Role; actingUserId: string },
): Promise<SessionContext> {
  const [session] = await tx
    .select({ trainerId: classSession.trainerId, startTime: classSession.startTime })
    .from(classSession)
    .where(
      and(
        eq(classSession.id, sessionId),
        eq(classSession.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!session) throw new SessionNotFoundError(sessionId);

  if (guard.callerRole === "trainer" && session.trainerId !== guard.actingUserId) {
    throw new ForeignSessionError(sessionId);
  }

  return {
    trainerId: session.trainerId,
    sessionStart: session.startTime,
    sessionId,
    organizationId,
  };
}

async function loadParentEmailsForSession(
  tx: TenantDb,
  session: SessionContext,
): Promise<{ clientId: string; email: string }[]> {
  const rows = await tx
    .select({
      clientId: client.id,
      email: client.email,
    })
    .from(booking)
    .innerJoin(
      athlete,
      and(
        eq(athlete.id, booking.athleteId),
        eq(athlete.organizationId, session.organizationId),
      ),
    )
    .innerJoin(
      client,
      and(
        eq(client.id, athlete.parentClientId),
        eq(client.organizationId, session.organizationId),
      ),
    )
    .where(
      and(
        eq(booking.sessionId, session.sessionId),
        eq(booking.organizationId, session.organizationId),
      ),
    );
  return rows.map((r) => ({
    clientId: r.clientId,
    email: r.email,
  }));
}

export interface SaveLessonTopicInput {
  organizationId: string;
  organizationName: string;
  sessionId: string;
  title: string;
  body?: string;
  createdByUserId: string;
  callerRole: Role;
  actor: AuditActor;
  locale: Locale;
}

export async function saveLessonTopic(
  tx: TenantDb,
  input: SaveLessonTopicInput,
): Promise<{ wasInserted: boolean; sessionId: string }> {
  const session = await loadSessionAndAssertOwnership(
    tx,
    input.organizationId,
    input.sessionId,
    { callerRole: input.callerRole, actingUserId: input.createdByUserId },
  );

  const row = await createLessonTopic(tx, {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    title: input.title,
    body: input.body,
    createdByUserId: input.createdByUserId,
  });

  if (row.wasInserted) {
    await recordAudit(tx, {
      action: "lesson_topic.create",
      actor: input.actor,
      organizationId: input.organizationId,
      targetType: "lesson_topic",
      targetId: row.id,
      targetLabel: row.title,
      metadata: { sessionId: input.sessionId },
    });

    const parents = await loadParentEmailsForSession(tx, session);

    await emitDomainNotification(tx, {
      eventType: "lesson_topic_added",
      organizationId: input.organizationId,
      accountId: null,
      recipients: parents.map((p) => ({
        kind: "client",
        clientId: p.clientId,
        email: p.email,
        locale: input.locale,
      })),
      params: {
        orgName: input.organizationName,
        sessionDate: session.sessionStart.toISOString(),
      },
      dedupeBasis: `lesson-topic:${input.sessionId}`,
    });
  }

  return { wasInserted: row.wasInserted, sessionId: input.sessionId };
}

export interface CreateHomeworkInput {
  organizationId: string;
  organizationName: string;
  sessionId: string;
  description: string;
  dueDate?: string;
  createdByUserId: string;
  callerRole: Role;
  actor: AuditActor;
  locale: Locale;
}

export async function createHomeworkEntry(
  tx: TenantDb,
  input: CreateHomeworkInput,
): Promise<{ id: string; sessionId: string }> {
  const session = await loadSessionAndAssertOwnership(
    tx,
    input.organizationId,
    input.sessionId,
    { callerRole: input.callerRole, actingUserId: input.createdByUserId },
  );

  const row = await createHomeworkData(tx, {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    description: input.description,
    dueDate: input.dueDate,
    createdByUserId: input.createdByUserId,
  });

  await recordAudit(tx, {
    action: "homework.create",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "homework",
    targetId: row.id,
    targetLabel: input.description,
    metadata: {
      sessionId: input.sessionId,
      dueDate: input.dueDate ?? null,
    },
  });

  const parents = await loadParentEmailsForSession(tx, session);

  await emitDomainNotification(tx, {
    eventType: "homework_assigned",
    organizationId: input.organizationId,
    accountId: null,
    recipients: parents.map((p) => ({
      kind: "client",
      clientId: p.clientId,
      email: p.email,
      locale: input.locale as Locale,
    })),
    params: {
      orgName: input.organizationName,
      sessionDate: session.sessionStart.toISOString(),
      description: input.description,
      dueDate: input.dueDate ?? "",
    },
    dedupeBasis: `homework:${row.id}`,
  });

  return { id: row.id, sessionId: input.sessionId };
}

export interface MarkHomeworkCompletionInput {
  organizationId: string;
  homeworkId: string;
  athleteId: string;
  status: "done" | "not_done";
  markedByUserId: string;
  callerRole: Role;
  actor: AuditActor;
  now?: Date;
}

export async function markHomeworkCompletion(
  tx: TenantDb,
  input: MarkHomeworkCompletionInput,
): Promise<{ wasInserted: boolean }> {
  const [hw] = await tx
    .select({ sessionId: homework.sessionId })
    .from(homework)
    .where(
      and(
        eq(homework.id, input.homeworkId),
        eq(homework.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!hw) throw new Error(`Homework ${input.homeworkId} not found`);

  await loadSessionAndAssertOwnership(
    tx,
    input.organizationId,
    hw.sessionId,
    { callerRole: input.callerRole, actingUserId: input.markedByUserId },
  );

  const [ath] = await tx
    .select({ name: athlete.name })
    .from(athlete)
    .where(
      and(
        eq(athlete.id, input.athleteId),
        eq(athlete.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  const row = await upsertHomeworkCompletion(tx, {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    homeworkId: input.homeworkId,
    athleteId: input.athleteId,
    status: input.status,
    markedByUserId: input.markedByUserId,
    now: input.now,
  });

  await recordAudit(tx, {
    action: "homework_completion.mark",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "homework_completion",
    targetId: row.id,
    targetLabel: ath?.name ?? input.athleteId,
    metadata: {
      homeworkId: input.homeworkId,
      athleteId: input.athleteId,
      status: input.status,
    },
  });

  return { wasInserted: row.wasInserted };
}
