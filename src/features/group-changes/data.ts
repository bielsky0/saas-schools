import { and, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { TenantDb } from "@/lib/db/tenant";
import { booking, classSession, client, groupChangeRequest, groupType, type GroupChangeRequestStatus } from "@/lib/db/schema";

export interface GroupChangeRequestRow {
  id: string;
  clientName: string;
  sourceGroupName: string;
  targetGroupName: string;
  targetDate: Date;
  status: string;
  submittedAt: Date;
}

export async function listGroupChangeRequestsForTrainer(
  tx: TenantDb,
  organizationId: string,
  trainerId: string,
): Promise<GroupChangeRequestRow[]> {
  const sourceBooking = alias(booking, "source_booking");
  const sourceSession = alias(classSession, "source_session");
  const sourceGroupType = alias(groupType, "source_group_type");
  const targetSession = alias(classSession, "target_session");
  const targetGroupType = alias(groupType, "target_group_type");

  return tx
    .select({
      id: groupChangeRequest.id,
      clientName: sql<string>`COALESCE(${client.name}, '')`,
      sourceGroupName: sourceGroupType.name,
      targetGroupName: targetGroupType.name,
      targetDate: targetSession.startTime,
      status: groupChangeRequest.status,
      submittedAt: groupChangeRequest.submittedAt,
    })
    .from(groupChangeRequest)
    .innerJoin(
      client,
      and(eq(client.id, groupChangeRequest.clientId), eq(client.organizationId, organizationId)),
    )
    .innerJoin(
      sourceBooking,
      and(eq(sourceBooking.id, groupChangeRequest.sourceBookingId), eq(sourceBooking.organizationId, organizationId)),
    )
    .innerJoin(
      sourceSession,
      and(eq(sourceSession.id, sourceBooking.sessionId), eq(sourceSession.organizationId, organizationId)),
    )
    .innerJoin(
      sourceGroupType,
      and(eq(sourceGroupType.id, sourceSession.groupTypeId), eq(sourceGroupType.organizationId, organizationId)),
    )
    .innerJoin(
      targetSession,
      and(eq(targetSession.id, groupChangeRequest.targetSessionId), eq(targetSession.organizationId, organizationId)),
    )
    .innerJoin(
      targetGroupType,
      and(eq(targetGroupType.id, targetSession.groupTypeId), eq(targetGroupType.organizationId, organizationId)),
    )
    .where(
      and(
        eq(groupChangeRequest.organizationId, organizationId),
        or(
          eq(targetSession.trainerId, trainerId),
          eq(sourceSession.trainerId, trainerId),
        ),
      ),
    )
    .orderBy(desc(groupChangeRequest.submittedAt));
}

/** Count of requests in a given status for the whole organization (dashboard pending card). */
export async function countGroupChangeRequests(
  tx: TenantDb,
  organizationId: string,
  status: GroupChangeRequestStatus,
): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(groupChangeRequest)
    .where(
      and(
        eq(groupChangeRequest.organizationId, organizationId),
        eq(groupChangeRequest.status, status),
      ),
    );
  return row?.count ?? 0;
}
