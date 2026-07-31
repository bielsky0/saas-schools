import { and, between, eq, ne } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { changed, recordAudit } from "@/features/admin/audit";
import { classSession } from "@/lib/db/schema";
import { SQLSTATE_EXCLUSION_VIOLATION, sqlStateOf } from "@/lib/db/sql-error";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * Single-session trainer substitution (langlion US-21.2, §2.11).
 *
 * Changes the trainer for ONE session. Always goes through the EXCLUDE constraint
 * `class_session_trainer_no_overlap_excl` (§5.1) — hard block on collision.
 * Sets `isManuallyAdjusted = true` so a later bulk pattern update skips this row.
 *
 * LOCK ORDER: class_session first (same as cancel-session.ts, create.ts).
 */

export class SessionNotFoundError extends Error {
  constructor() {
    super("Session not found");
    this.name = "SessionNotFoundError";
  }
}

export class SessionAlreadyCancelledError extends Error {
  constructor() {
    super("Session is already cancelled");
    this.name = "SessionAlreadyCancelledError";
  }
}

export class SessionPastError extends Error {
  constructor() {
    super("Session is in the past");
    this.name = "SessionPastError";
  }
}

export class TrainerCollisionError extends Error {
  constructor() {
    super("New trainer has a schedule conflict at that time");
    this.name = "TrainerCollisionError";
  }
}

export class NewTrainerSameAsCurrentError extends Error {
  constructor() {
    super("New trainer is the same as the current trainer");
    this.name = "NewTrainerSameAsCurrentError";
  }
}

export interface SubstituteTrainerInput {
  organizationId: string;
  sessionId: string;
  newTrainerId: string | null;
  actor: AuditActor;
  now?: Date;
}

export async function substituteTrainerInSession(
  tx: TenantDb,
  input: SubstituteTrainerInput,
): Promise<void> {
  const now = input.now ?? new Date();

  // 1. Lock session FIRST — LOCK ORDER invariant.
  const [session] = await tx
    .select()
    .from(classSession)
    .where(
      and(eq(classSession.id, input.sessionId), eq(classSession.organizationId, input.organizationId)),
    )
    .limit(1)
    .for("update");

  if (!session) throw new SessionNotFoundError();
  if (session.status === "cancelled") throw new SessionAlreadyCancelledError();
  if (session.startTime < now) throw new SessionPastError();
  if (session.trainerId === input.newTrainerId) throw new NewTrainerSameAsCurrentError();

  const beforeTrainer = session.trainerId;

  // 2. Update trainer — EXCLUDE constraint fires on collision (§5.1).
  try {
    await tx
      .update(classSession)
      .set({
        trainerId: input.newTrainerId,
        isManuallyAdjusted: true,
        updatedAt: now,
      })
      .where(
        and(eq(classSession.id, input.sessionId), eq(classSession.organizationId, input.organizationId)),
      );
  } catch (error) {
    if (sqlStateOf(error) === SQLSTATE_EXCLUSION_VIOLATION) {
      throw new TrainerCollisionError();
    }
    throw error;
  }

  // 3. Audit.
  await recordAudit(tx, {
    action: "session.reassign_trainer",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "class_session",
    targetId: input.sessionId,
    targetLabel: input.sessionId,
    metadata: {
      changes: changed({ trainerId: beforeTrainer }, { trainerId: input.newTrainerId }, ["trainerId"]),
    },
  });
}

export interface SubstituteForDateRangeInput {
  organizationId: string;
  trainerId: string;
  substituteTrainerId: string;
  startDate: string;
  endDate: string;
  actor: AuditActor;
  now?: Date;
}

/**
 * Batch-substitute all future sessions within a date range for a trainer.
 * Used by Faza 4 leave approval to auto-assign a substitute for all
 * scheduled sessions during the leave period.
 */
export async function substituteTrainerForDateRange(
  tx: TenantDb,
  input: SubstituteForDateRangeInput,
): Promise<number> {
  const now = input.now ?? new Date();

  const sessions = await tx
    .select({ id: classSession.id })
    .from(classSession)
    .where(
      and(
        eq(classSession.organizationId, input.organizationId),
        eq(classSession.trainerId, input.trainerId),
        eq(classSession.status, "scheduled"),
        ne(classSession.trainerId, input.substituteTrainerId),
        between(
          classSession.startTime,
          new Date(`${input.startDate}T00:00:00Z`),
          new Date(`${input.endDate}T23:59:59Z`),
        ),
      ),
    )
    .for("update");

  if (sessions.length === 0) return 0;

  await tx
    .update(classSession)
    .set({
      trainerId: input.substituteTrainerId,
      isManuallyAdjusted: true,
      updatedAt: now,
    })
    .where(
      and(
        eq(classSession.organizationId, input.organizationId),
        eq(classSession.trainerId, input.trainerId),
        eq(classSession.status, "scheduled"),
        between(
          classSession.startTime,
          new Date(`${input.startDate}T00:00:00Z`),
          new Date(`${input.endDate}T23:59:59Z`),
        ),
      ),
    );

  await recordAudit(tx, {
    action: "session.mass_reassign_trainer",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "class_session",
    targetId: `batch:${input.trainerId}`,
    targetLabel: `Bulk substitute ${sessions.length} sessions`,
    metadata: {
      changes: {
        fromTrainerId: input.trainerId,
        toTrainerId: input.substituteTrainerId,
        count: sessions.length,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    },
  });

  return sessions.length;
}
