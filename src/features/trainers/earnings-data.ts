import { and, eq, gte, lte, ne, sql } from "drizzle-orm";

import { booking, classSession, groupType } from "@/lib/db/schema";
import { trainerRate } from "@/lib/db/schema/trainer-rates";
import type { TenantDb } from "@/lib/db/tenant";
import type { TrainerRateRow } from "./rate-data";

/** Intermediate type for a session fetched from the DB. */
interface SessionRow {
  id: string;
  startTime: Date;
  endTime: Date;
  groupTypeId: string;
  trainerId: string | null;
  groupTypeName: string;
  trainerName: string | null;
}

// ── Public types ────────────────────────────────────────────────────────────

/**
 * One line in the earnings report: a session that qualified AND has a resolved
 * trainer rate.
 */
export interface EarningsLine {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  groupTypeId: string;
  groupTypeName: string;
  trainerId: string;
  /** The rate row that was matched (Constraint 8). */
  matchedRateId: string;
  amount: number;
  rateType: "flat_per_session" | "hourly";
  /** The `effectiveFrom` of the matched rate. */
  rateEffectiveFrom: Date;
  /** The final calculated earnings amount for this session (minor units). */
  calculatedAmount: number;
}

/**
 * A session that qualified for the report (has attendance) but has NO matching
 * rate — a configuration gap that the admin must fill.
 */
export interface NoRateSession {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  groupTypeId: string;
  groupTypeName: string;
  trainerId: string;
  trainerName: string | null;
}

// ── Constraint 8 resolution ─────────────────────────────────────────────────

/**
 * Resolve the applicable trainer_rate for (trainerId, groupTypeId) at a given
 * point in time, per Constraint 8 (§1.3):
 *
 *   1. trainer_rate WHERE (trainer_id, group_type_id)
 *      WITH effective_from <= referenceTime
 *      ORDER BY effective_from DESC LIMIT 1
 *   2. trainer_rate WHERE (trainer_id, group_type_id IS NULL)
 *      WITH effective_from <= referenceTime
 *      ORDER BY effective_from DESC LIMIT 1
 *   3. No match → null (session goes to "no rate" list)
 */
async function resolveRate(
  tx: TenantDb,
  organizationId: string,
  trainerId: string,
  groupTypeId: string,
  referenceTime: Date,
): Promise<TrainerRateRow | null> {
  // Step 1: try group-specific rate
  const [specific] = await tx
    .select()
    .from(trainerRate)
    .where(
      and(
        eq(trainerRate.organizationId, organizationId),
        eq(trainerRate.trainerId, trainerId),
        eq(trainerRate.groupTypeId, groupTypeId),
        lte(trainerRate.effectiveFrom, referenceTime),
      ),
    )
    .orderBy(sql`${trainerRate.effectiveFrom} DESC`)
    .limit(1);
  if (specific) return specific;

  // Step 2: try base rate (null groupTypeId)
  const [base] = await tx
    .select()
    .from(trainerRate)
    .where(
      and(
        eq(trainerRate.organizationId, organizationId),
        eq(trainerRate.trainerId, trainerId),
        sql`${trainerRate.groupTypeId} IS NULL`,
        lte(trainerRate.effectiveFrom, referenceTime),
      ),
    )
    .orderBy(sql`${trainerRate.effectiveFrom} DESC`)
    .limit(1);
  return base ?? null;
}

// ── Amount calculation ──────────────────────────────────────────────────────

/**
 * Calculate the earnings amount for a session given the matched rate.
 *
 * - flat_per_session: amount (flat fee per session, regardless of duration)
 * - hourly: FLOOR(amount × duration_hours) — truncated per business decision
 *
 * Duration is computed from session.endTime - session.startTime in hours.
 */
function calculateAmount(rate: TrainerRateRow, startTime: Date, endTime: Date): number {
  if (rate.rateType === "flat_per_session") {
    return rate.amount;
  }

  // hourly: FLOOR(amount × duration_in_hours)
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  return Math.floor(rate.amount * durationHours);
}

// ── Report generation ───────────────────────────────────────────────────────

export interface EarningsReportInput {
  organizationId: string;
  /** If set, only sessions for this trainer. Owner/Admin may filter; Trainer
   * always gets caller.userId forced. */
  trainerId?: string;
  dateFrom: Date;
  dateTo: Date;
}

export interface EarningsReport {
  /** Sessions with a resolved rate. */
  lines: EarningsLine[];
  /** Sessions that qualified (attendance exists) but have no matching rate. */
  noRateSessions: NoRateSession[];
  /** Total sum of calculatedAmount across all lines. */
  total: number;
  /** The trainerId this report was scoped to (after enforcement). */
  scopedTrainerId: string | null;
}

/**
 * Generate the earnings report for a given date range.
 *
 * TWO ENTRY POINTS:
 *   - Owner/Admin: `trainerId` may be omitted (all trainers) or set (filter).
 *   - Trainer: `trainerId` is FORCED to caller.userId — any input is ignored.
 *
 * Called from the action layer after permission checking.
 */
export async function generateEarningsReport(
  tx: TenantDb,
  input: EarningsReportInput,
  /** Whether to force trainer-scoping (for Trainer role). */
  forceSelfScope?: { callerUserId: string },
): Promise<EarningsReport> {
  const effectiveTrainerId = forceSelfScope
    ? forceSelfScope.callerUserId
    : input.trainerId;

  // Build conditions for qualifying sessions
  const sessionConditions = [
    eq(classSession.organizationId, input.organizationId),
    ne(classSession.status, "cancelled"),
    gte(classSession.startTime, input.dateFrom),
    lte(classSession.endTime, input.dateTo),
  ];
  if (effectiveTrainerId) {
    sessionConditions.push(eq(classSession.trainerId, effectiveTrainerId));
  }

  const sessions: SessionRow[] = await tx
    .select({
      id: classSession.id,
      startTime: classSession.startTime,
      endTime: classSession.endTime,
      groupTypeId: classSession.groupTypeId,
      trainerId: classSession.trainerId,
      groupTypeName: groupType.name,
      trainerName: sql<string>`NULL`,
    })
    .from(classSession)
    .innerJoin(
      groupType,
      and(
        eq(groupType.id, classSession.groupTypeId),
        eq(groupType.organizationId, classSession.organizationId),
      ),
    )
    .where(and(...sessionConditions))
    .orderBy(classSession.startTime);

  // Filter to sessions where ≥1 booking has attendanceStatus != 'unmarked'
  const qualifyingSessions: SessionRow[] = [];
  for (const session of sessions) {
    const [attended] = await tx
      .select({ id: booking.id })
      .from(booking)
      .where(
        and(
          eq(booking.organizationId, input.organizationId),
          eq(booking.sessionId, session.id),
          ne(booking.attendanceStatus, "unmarked"),
        ),
      )
      .limit(1);
    if (attended) {
      qualifyingSessions.push(session);
    }
  }

  const lines: EarningsLine[] = [];
  const noRateSessions: NoRateSession[] = [];
  let total = 0;

  for (const session of qualifyingSessions) {
    if (!session.trainerId) continue;
    const rate = await resolveRate(
      tx,
      input.organizationId,
      session.trainerId,
      session.groupTypeId,
      session.startTime,
    );

    if (!rate) {
      noRateSessions.push({
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        groupTypeId: session.groupTypeId,
        groupTypeName: session.groupTypeName,
        trainerId: session.trainerId,
        trainerName: null,
      });
      continue;
    }

    const calculatedAmount = calculateAmount(rate, session.startTime, session.endTime);
    total += calculatedAmount;

    lines.push({
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      groupTypeId: session.groupTypeId,
      groupTypeName: session.groupTypeName,
      trainerId: session.trainerId,
      matchedRateId: rate.id,
      amount: rate.amount,
      rateType: rate.rateType,
      rateEffectiveFrom: rate.effectiveFrom,
      calculatedAmount,
    });
  }

  return { lines, noRateSessions, total, scopedTrainerId: effectiveTrainerId ?? null };
}
