import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import { booking, classSession, groupType } from "@/lib/db/schema";
import { ACTIVE_BOOKING_FILTER } from "@/features/bookings/data";

export const DEFAULT_TRIAL_CONVERSION_WINDOW_DAYS = 30;

export type TrialConversionRow = {
  groupTypeId: string;
  name: string;
  /**
   * Number of unique athlete_ids with at least one active (non-cancelled) booking
   * on a session of this trial group_type. Counts athletes, not booking rows —
   * one athlete who tried twice counts as one trial, keeping conversionRate ≤ 100%.
   */
  trialCount: number;
  /**
   * Subset of trialCount: athletes who also have at least one active booking on
   * a different (non-trial) group_type whose session start time falls within
   * `windowDays` after their first trial booking on this group_type.
   */
  conversionCount: number;
  /**
   * conversionCount / trialCount, as a fraction between 0 and 1.
   * 0 when trialCount is 0.
   */
  conversionRate: number;
};

type TrialGroupType = { id: string; name: string };
type TrialBookingRow = { athleteId: string; sessionId: string; sessionStartTime: Date };
type SessionGtRow = { id: string; groupTypeId: string };
type NonTrialBookingRow = { athleteId: string; sessionStartTime: Date };

/**
 * Pure computation: given trial group_types + trial bookings + non-trial bookings,
 * compute the conversion report. Separated from the DB query layer so it can be
 * tested in vitest without a database.
 */
export function computeTrialConversion(
  trialGroupTypes: TrialGroupType[],
  trialSessions: SessionGtRow[],
  trialBookings: TrialBookingRow[],
  nonTrialBookings: NonTrialBookingRow[],
  windowDays: number,
): TrialConversionRow[] {
  if (trialGroupTypes.length === 0) return [];
  if (trialSessions.length === 0 || trialBookings.length === 0) {
    return trialGroupTypes.map(zeroRow);
  }

  const sessionGtMap = new Map(trialSessions.map((s) => [s.id, s.groupTypeId]));

  // Earliest trial booking time per athlete per trial group_type
  const athleteTrialFirstTime = new Map<string, Map<string, Date>>();
  for (const b of trialBookings) {
    const gtId = sessionGtMap.get(b.sessionId);
    if (!gtId) continue;
    if (!athleteTrialFirstTime.has(b.athleteId)) {
      athleteTrialFirstTime.set(b.athleteId, new Map());
    }
    const perGt = athleteTrialFirstTime.get(b.athleteId)!;
    const existing = perGt.get(gtId);
    if (!existing || b.sessionStartTime < existing) {
      perGt.set(gtId, b.sessionStartTime);
    }
  }

  if (athleteTrialFirstTime.size === 0) {
    return trialGroupTypes.map(zeroRow);
  }

  // Group non-trial bookings by athlete
  const athleteNonTrialTimes = new Map<string, Date[]>();
  if (nonTrialBookings.length > 0) {
    for (const b of nonTrialBookings) {
      if (!athleteNonTrialTimes.has(b.athleteId)) {
        athleteNonTrialTimes.set(b.athleteId, []);
      }
      athleteNonTrialTimes.get(b.athleteId)!.push(b.sessionStartTime);
    }
  }

  // Window check per athlete-groupType pair
  const convertedAthleteIdsPerGt = new Map<string, Set<string>>();
  for (const [athleteId, perGt] of athleteTrialFirstTime) {
    const nonTrialTimes = athleteNonTrialTimes.get(athleteId) ?? [];

    for (const [gtId, firstTrialTime] of perGt) {
      const windowEnd = new Date(firstTrialTime.getTime() + windowDays * 24 * 60 * 60 * 1000);
      const hasConversion = nonTrialTimes.some(
        (t) => t >= firstTrialTime && t <= windowEnd,
      );
      if (hasConversion) {
        if (!convertedAthleteIdsPerGt.has(gtId)) {
          convertedAthleteIdsPerGt.set(gtId, new Set());
        }
        convertedAthleteIdsPerGt.get(gtId)!.add(athleteId);
      }
    }
  }

  return trialGroupTypes.map((gt) => {
    const trialCount = countAthletesForGroupType(athleteTrialFirstTime, gt.id);
    const conversionCount = convertedAthleteIdsPerGt.get(gt.id)?.size ?? 0;
    return {
      groupTypeId: gt.id,
      name: gt.name,
      trialCount,
      conversionCount,
      conversionRate: trialCount > 0 ? conversionCount / trialCount : 0,
    };
  });
}

/**
 * Trial-to-paid conversion report per trial group_type.
 *
 * For each group_type with `isTrialOffer=true`, counts unique athletes who have
 * active bookings on its sessions, and checks whether those same athletes also
 * enrolled in a non-trial group_type within the conversion window.
 *
 * Conversion window: the non-trial booking's `sessionStartTime` must fall
 * between the athlete's FIRST trial booking time on this group_type and that
 * time plus `windowDays` days.
 *
 * Queries three times at most (trial sessions, trial bookings, non-trial
 * bookings) — no N+1 per athlete or per group_type. The window comparison
 * runs in JS on the fetched rows (see `computeTrialConversion`).
 *
 * The `organizationId` comes from the caller's session context (ctx.org.id),
 * never from client input — standard IDOR guard pattern matching every other
 * data access function in the project.
 */
export async function getTrialConversionReport(
  tx: TenantDb,
  organizationId: string,
  windowDays: number = DEFAULT_TRIAL_CONVERSION_WINDOW_DAYS,
): Promise<TrialConversionRow[]> {
  const trialGroupTypes = await tx
    .select({ id: groupType.id, name: groupType.name })
    .from(groupType)
    .where(
      and(
        eq(groupType.organizationId, organizationId),
        eq(groupType.isTrialOffer, true),
        sql`${groupType.deletedAt} IS NULL`,
      ),
    );

  if (trialGroupTypes.length === 0) return [];

  const trialGroupTypeIds = trialGroupTypes.map((gt) => gt.id);

  const trialSessions = await tx
    .select({ id: classSession.id, groupTypeId: classSession.groupTypeId })
    .from(classSession)
    .where(
      and(
        eq(classSession.organizationId, organizationId),
        inArray(classSession.groupTypeId, trialGroupTypeIds),
      ),
    );

  const trialBookings = trialSessions.length > 0
    ? await tx
        .select({
          athleteId: booking.athleteId,
          sessionId: booking.sessionId,
          sessionStartTime: booking.sessionStartTime,
        })
        .from(booking)
        .where(
          and(
            eq(booking.organizationId, organizationId),
            inArray(booking.sessionId, trialSessions.map((s) => s.id)),
            ACTIVE_BOOKING_FILTER,
          ),
        )
    : [];

  const nonTrialSessionIds = await fetchNonTrialSessionIds(tx, organizationId);

  const nonTrialBookings = nonTrialSessionIds.length > 0 && trialBookings.length > 0
    ? await tx
        .select({
          athleteId: booking.athleteId,
          sessionStartTime: booking.sessionStartTime,
        })
        .from(booking)
        .where(
          and(
            eq(booking.organizationId, organizationId),
            inArray(booking.sessionId, nonTrialSessionIds),
            ACTIVE_BOOKING_FILTER,
            inArray(
              booking.athleteId,
              Array.from(new Set(trialBookings.map((b) => b.athleteId))),
            ),
          ),
        )
    : [];

  return computeTrialConversion(
    trialGroupTypes,
    trialSessions,
    trialBookings,
    nonTrialBookings,
    windowDays,
  );
}

async function fetchNonTrialSessionIds(
  tx: TenantDb,
  organizationId: string,
): Promise<string[]> {
  const nonTrialGroupTypes = await tx
    .select({ id: groupType.id })
    .from(groupType)
    .where(
      and(
        eq(groupType.organizationId, organizationId),
        ne(groupType.isTrialOffer, true),
        sql`${groupType.deletedAt} IS NULL`,
      ),
    );
  if (nonTrialGroupTypes.length === 0) return [];

  const sessions = await tx
    .select({ id: classSession.id })
    .from(classSession)
    .where(
      and(
        eq(classSession.organizationId, organizationId),
        inArray(classSession.groupTypeId, nonTrialGroupTypes.map((gt) => gt.id)),
      ),
    );

  return sessions.map((s) => s.id);
}

function zeroRow(gt: { id: string; name: string }): TrialConversionRow {
  return { groupTypeId: gt.id, name: gt.name, trialCount: 0, conversionCount: 0, conversionRate: 0 };
}

function countAthletesForGroupType(
  athleteMap: Map<string, Map<string, Date>>,
  groupTypeId: string,
): number {
  let count = 0;
  for (const perGt of athleteMap.values()) {
    if (perGt.has(groupTypeId)) count++;
  }
  return count;
}
