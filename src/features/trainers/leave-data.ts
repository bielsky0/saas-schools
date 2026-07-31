import { and, asc, between, desc, eq, gte, sql } from "drizzle-orm";
import type { LeaveRequestStatus } from "@/lib/db/schema";

import { classSession, leaveRequest, user } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export interface LeaveRequestRow {
  id: string;
  trainerId: string;
  trainerName: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  substituteTrainerId: string | null;
  substituteTrainerName: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  sessionCount: number;
}

export interface LeaveRequestFilters {
  status?: string;
  trainerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listLeaveRequests(
  tx: TenantDb,
  organizationId: string,
  filters?: LeaveRequestFilters,
): Promise<LeaveRequestRow[]> {
  const conditions = [eq(leaveRequest.organizationId, organizationId)];

  if (filters?.status) conditions.push(eq(leaveRequest.status, filters.status as LeaveRequestStatus));
  if (filters?.trainerId) conditions.push(eq(leaveRequest.trainerId, filters.trainerId));
  if (filters?.dateFrom) conditions.push(gte(leaveRequest.startDate, filters.dateFrom));

  const rows = await tx
    .select({
      id: leaveRequest.id,
      trainerId: leaveRequest.trainerId,
      trainerName: user.name,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      substituteTrainerId: leaveRequest.substituteTrainerId,
      substituteTrainerName: sql<string | null>`sub_user.name`,
      reviewedByUserId: leaveRequest.reviewedByUserId,
      reviewedAt: leaveRequest.reviewedAt,
      rejectionReason: leaveRequest.rejectionReason,
      createdAt: leaveRequest.createdAt,
      sessionCount: sql<number>`
        (SELECT COUNT(*) FROM "class_session"
         WHERE "class_session"."organizationId" = ${leaveRequest.organizationId}
           AND "class_session"."trainerId" = ${leaveRequest.trainerId}
           AND "class_session"."status" = 'scheduled'
           AND "class_session"."startTime" >= (${leaveRequest.startDate})::timestamptz
           AND "class_session"."startTime" < (${leaveRequest.endDate}::date + 1)::timestamptz
        )
      `.mapWith(Number),
    })
    .from(leaveRequest)
    .innerJoin(user, eq(leaveRequest.trainerId, user.id))
    .leftJoin(sql`"user" AS sub_user`, sql`sub_user.id = ${leaveRequest.substituteTrainerId}`)
    .where(and(...conditions))
    .orderBy(desc(leaveRequest.createdAt));

  return rows;
}

export async function getLeaveRequest(
  tx: TenantDb,
  organizationId: string,
  requestId: string,
): Promise<LeaveRequestRow | null> {
  const rows = await tx
    .select({
      id: leaveRequest.id,
      trainerId: leaveRequest.trainerId,
      trainerName: user.name,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      substituteTrainerId: leaveRequest.substituteTrainerId,
      substituteTrainerName: sql<string | null>`sub_user.name`,
      reviewedByUserId: leaveRequest.reviewedByUserId,
      reviewedAt: leaveRequest.reviewedAt,
      rejectionReason: leaveRequest.rejectionReason,
      createdAt: leaveRequest.createdAt,
      sessionCount: sql<number>`
        (SELECT COUNT(*) FROM "class_session"
         WHERE "class_session"."organizationId" = ${leaveRequest.organizationId}
           AND "class_session"."trainerId" = ${leaveRequest.trainerId}
           AND "class_session"."status" = 'scheduled'
           AND "class_session"."startTime" >= (${leaveRequest.startDate})::timestamptz
           AND "class_session"."startTime" < (${leaveRequest.endDate}::date + 1)::timestamptz
        )
      `.mapWith(Number),
    })
    .from(leaveRequest)
    .innerJoin(user, eq(leaveRequest.trainerId, user.id))
    .leftJoin(sql`"user" AS sub_user`, sql`sub_user.id = ${leaveRequest.substituteTrainerId}`)
    .where(
      and(
        eq(leaveRequest.id, requestId),
        eq(leaveRequest.organizationId, organizationId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getLeaveConflicts(
  tx: TenantDb,
  organizationId: string,
  trainerId: string,
  startDate: string,
  endDate: string,
) {
  return tx
    .select({
      id: classSession.id,
      startTime: classSession.startTime,
      endTime: classSession.endTime,
    })
    .from(classSession)
    .where(
      and(
        eq(classSession.organizationId, organizationId),
        eq(classSession.trainerId, trainerId),
        eq(classSession.status, "scheduled"),
        between(
          classSession.startTime,
          new Date(`${startDate}T00:00:00Z`),
          new Date(`${endDate}T23:59:59Z`),
        ),
      ),
    )
    .orderBy(asc(classSession.startTime));
}

export async function getActiveLeaves(
  tx: TenantDb,
  organizationId: string,
  date?: string,
) {
  const targetDate = date ?? new Date().toISOString().split("T")[0];

  return tx
    .select({
      id: leaveRequest.id,
      trainerId: leaveRequest.trainerId,
      trainerName: user.name,
      substituteTrainerId: leaveRequest.substituteTrainerId,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
    })
    .from(leaveRequest)
    .innerJoin(user, eq(leaveRequest.trainerId, user.id))
    .where(
      and(
        eq(leaveRequest.organizationId, organizationId),
        eq(leaveRequest.status, "approved"),
        sql`${leaveRequest.startDate} <= ${targetDate}`,
        sql`${leaveRequest.endDate} >= ${targetDate}`,
      ),
    );
}
