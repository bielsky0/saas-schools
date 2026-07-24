import { alias } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { issueCredits } from "@/features/credits/issue";
import { getCreditTypeForGroupType } from "@/features/credits/data";
import { startConnectGroupChangeCheckout } from "@/features/billing/connect-checkout";
import { emitDomainNotification } from "@/features/notifications/emit";
import {
  athlete,
  booking,
  classSession,
  client,
  groupChangeRequest,
  groupType,
  organization,
} from "@/lib/db/schema";
import { db } from "@/lib/db";
import type { TenantDb } from "@/lib/db/tenant";
import { countActiveBookingsForSession } from "./data";

export class ChangeRequestNotFoundError extends Error {
  constructor() {
    super("Group change request not found");
    this.name = "ChangeRequestNotFoundError";
  }
}

export class ChangeRequestNotSubmittableError extends Error {
  constructor(status: string) {
    super(`Group change request is not in submittable status: ${status}`);
    this.name = "ChangeRequestNotSubmittableError";
  }
}

export class SessionFullError extends Error {
  constructor() {
    super("Target session is full");
    this.name = "SessionFullError";
  }
}

export class SourceBookingNotFoundError extends Error {
  constructor() {
    super("Source booking not found");
    this.name = "SourceBookingNotFoundError";
  }
}

export interface AdminApproveInput {
  organizationId: string;
  requestId: string;
  reviewedByUserId: string;
  timeZone: string;
  now?: Date;
  actor: AuditActor;
  subdomain?: string | null;
}

export interface AdminRejectInput {
  organizationId: string;
  requestId: string;
  reviewedByUserId: string;
  rejectionReason: string;
  actor: AuditActor;
}

export interface AdminApproveResult {
  status: string;
  priceDifference: number | null;
  checkoutUrl?: string;
  resultingBookingId?: string;
}

interface NotificationData {
  clientId: string;
  clientEmail: string;
  athleteName: string;
  sourceGroupName: string;
  targetGroupName: string;
}

async function loadNotificationData(
  organizationId: string,
  requestId: string,
): Promise<NotificationData | null> {
  const srcSession = alias(classSession, "src_session");
  const tgtSession = alias(classSession, "tgt_session");
  const srcGroup = alias(groupType, "src_group");
  const tgtGroup = alias(groupType, "tgt_group");

  const [row] = await db
    .select({
      clientId: athlete.parentClientId,
      clientEmail: client.email,
      athleteName: athlete.name,
      sourceGroupName: srcGroup.name,
      targetGroupName: tgtGroup.name,
    })
    .from(groupChangeRequest)
    .innerJoin(booking, eq(booking.id, groupChangeRequest.sourceBookingId))
    .innerJoin(
      athlete,
      and(eq(athlete.id, booking.athleteId), eq(athlete.organizationId, organizationId)),
    )
    .innerJoin(
      client,
      and(eq(client.id, athlete.parentClientId), eq(client.organizationId, organizationId)),
    )
    .innerJoin(
      srcSession,
      and(eq(srcSession.id, booking.sessionId), eq(srcSession.organizationId, organizationId)),
    )
    .innerJoin(
      tgtSession,
      and(eq(tgtSession.id, groupChangeRequest.targetSessionId), eq(tgtSession.organizationId, organizationId)),
    )
    .innerJoin(
      srcGroup,
      and(eq(srcGroup.id, srcSession.groupTypeId), eq(srcGroup.organizationId, organizationId)),
    )
    .innerJoin(
      tgtGroup,
      and(eq(tgtGroup.id, tgtSession.groupTypeId), eq(tgtGroup.organizationId, organizationId)),
    )
    .where(
      and(
        eq(groupChangeRequest.id, requestId),
        eq(groupChangeRequest.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function adminApproveChangeRequest(
  tx: TenantDb,
  input: AdminApproveInput,
): Promise<AdminApproveResult> {
  const now = input.now ?? new Date();

  const [req] = await tx
    .select()
    .from(groupChangeRequest)
    .where(
      and(
        eq(groupChangeRequest.id, input.requestId),
        eq(groupChangeRequest.organizationId, input.organizationId),
      ),
    )
    .limit(1)
    .for("update");

  if (!req) throw new ChangeRequestNotFoundError();
  if (req.status !== "submitted") {
    throw new ChangeRequestNotSubmittableError(req.status);
  }

  const [sourceBookingRow] = await tx
    .select({
      id: booking.id,
      athleteId: booking.athleteId,
      paymentStatus: booking.paymentStatus,
      sessionId: booking.sessionId,
    })
    .from(booking)
    .where(
      and(
        eq(booking.id, req.sourceBookingId),
        eq(booking.organizationId, input.organizationId),
      ),
    )
    .limit(1)
    .for("update");
  if (!sourceBookingRow) throw new SourceBookingNotFoundError();

  const [targetSession] = await tx
    .select({
      id: classSession.id,
      groupTypeId: classSession.groupTypeId,
      capacity: classSession.capacity,
      status: classSession.status,
      startTime: classSession.startTime,
      endTime: classSession.endTime,
    })
    .from(classSession)
    .where(
      and(
        eq(classSession.id, req.targetSessionId),
        eq(classSession.organizationId, input.organizationId),
      ),
    )
    .limit(1)
    .for("update");
  if (!targetSession) throw new Error("Target session not found");
  if (targetSession.status !== "scheduled") throw new Error("Target session is cancelled");

  const activeCount = await countActiveBookingsForSession(
    tx,
    input.organizationId,
    req.targetSessionId,
  );
  if (activeCount >= targetSession.capacity) {
    throw new SessionFullError();
  }

  const [srcGroupType] = await tx
    .select({ price: groupType.price })
    .from(groupType)
    .innerJoin(
      classSession,
      and(eq(classSession.groupTypeId, groupType.id), eq(classSession.organizationId, groupType.organizationId)),
    )
    .where(
      and(
        eq(classSession.id, sourceBookingRow.sessionId),
        eq(groupType.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!srcGroupType) throw new Error("Source group type not found");

  const [tgtGroupType] = await tx
    .select({ price: groupType.price })
    .from(groupType)
    .where(
      and(
        eq(groupType.id, targetSession.groupTypeId),
        eq(groupType.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!tgtGroupType) throw new Error("Target group type not found");

  const priceDifference = tgtGroupType.price - srcGroupType.price;

  const resultingPaymentStatus = priceDifference <= 0 ? "confirmed" : "payment_pending";
  const expiresAt = priceDifference > 0
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
    : null;

  const [resultingBooking] = await tx
    .insert(booking)
    .values({
      organizationId: input.organizationId,
      sessionId: req.targetSessionId,
      athleteId: sourceBookingRow.athleteId,
      paymentStatus: resultingPaymentStatus,
      priceSnapshot: { amount: tgtGroupType.price, currency: "PLN" },
      sessionStartTime: targetSession.startTime,
      sessionEndTime: targetSession.endTime,
    })
    .returning({ id: booking.id });
  if (!resultingBooking) throw new Error("Failed to create resulting booking");

  await tx
    .update(booking)
    .set({ paymentStatus: "cancelled", updatedAt: now })
    .where(eq(booking.id, req.sourceBookingId));

  const newStatus = priceDifference <= 0 ? "completed" : "awaiting_payment";

  await tx
    .update(groupChangeRequest)
    .set({
      status: newStatus,
      priceDifference,
      resultingBookingId: resultingBooking.id,
      expiresAt,
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(groupChangeRequest.id, input.requestId));

  if (priceDifference < 0) {
    const [sourceAthlete] = await tx
      .select({ parentClientId: athlete.parentClientId })
      .from(athlete)
      .where(
        and(
          eq(athlete.id, sourceBookingRow.athleteId),
          eq(athlete.organizationId, input.organizationId),
        ),
      )
      .limit(1);

    if (sourceAthlete) {
      const creditType = await getCreditTypeForGroupType(
        tx,
        input.organizationId,
        targetSession.groupTypeId,
      );
      if (creditType) {
        await issueCredits(tx, {
          organizationId: input.organizationId,
          clientId: sourceAthlete.parentClientId,
          creditTypeId: creditType.id,
          athleteId: sourceBookingRow.athleteId,
          quantity: 1,
          source: "cancellation",
          sourceBookingId: req.sourceBookingId,
          timeZone: input.timeZone,
          issuedAt: now,
        });
      }
    }
  }

  await recordAudit(tx, {
    action: "group_change.approve",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "group_change_request",
    targetId: input.requestId,
    targetLabel: input.requestId,
    metadata: {
      priceDifference,
      resultingBookingId: resultingBooking.id,
      status: newStatus,
    },
  });

  const notifData = await loadNotificationData(
    input.organizationId,
    input.requestId,
  );
  if (notifData) {
    if (newStatus === "completed") {
      await emitDomainNotification(tx, {
        eventType: "group-change-completed",
        organizationId: input.organizationId,
        accountId: null,
        recipients: [{
          kind: "client",
          clientId: notifData.clientId,
          email: notifData.clientEmail,
          locale: "pl",
        }],
        params: {
          sourceGroupName: notifData.sourceGroupName,
          targetGroupName: notifData.targetGroupName,
          athleteName: notifData.athleteName,
        },
        dedupeBasis: `group-change-completed:${input.requestId}`,
      });
    } else if (newStatus === "awaiting_payment") {
      await emitDomainNotification(tx, {
        eventType: "group-change-pending-payment",
        organizationId: input.organizationId,
        accountId: null,
        recipients: [{
          kind: "client",
          clientId: notifData.clientId,
          email: notifData.clientEmail,
          locale: "pl",
        }],
        params: {
          sourceGroupName: notifData.sourceGroupName,
          targetGroupName: notifData.targetGroupName,
          athleteName: notifData.athleteName,
          amount: (priceDifference / 100).toFixed(2),
          expiresAt: expiresAt?.toLocaleDateString("pl") ?? "",
        },
        dedupeBasis: `group-change-pending-payment:${input.requestId}`,
      });
    }
  }

  let checkoutUrl: string | undefined;
  if (priceDifference > 0) {
    const [orgRow] = await tx
      .select({
        currency: organization.currency,
        stripeConnectAccountId: organization.stripeConnectAccountId,
      })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .limit(1);

    if (orgRow?.stripeConnectAccountId) {
      const result = await startConnectGroupChangeCheckout(
        input.organizationId,
        input.subdomain ?? null,
        input.requestId,
        priceDifference,
        orgRow.currency ?? "PLN",
        orgRow.stripeConnectAccountId,
      );
      if (result.ok) {
        checkoutUrl = result.url;
      }
    }
  }

  return {
    status: newStatus,
    priceDifference,
    checkoutUrl,
    resultingBookingId: resultingBooking.id,
  };
}

export async function adminRejectChangeRequest(
  tx: TenantDb,
  input: AdminRejectInput,
): Promise<void> {
  const [req] = await tx
    .select()
    .from(groupChangeRequest)
    .where(
      and(
        eq(groupChangeRequest.id, input.requestId),
        eq(groupChangeRequest.organizationId, input.organizationId),
      ),
    )
    .limit(1)
    .for("update");

  if (!req) throw new ChangeRequestNotFoundError();
  if (req.status !== "submitted") {
    throw new ChangeRequestNotSubmittableError(req.status);
  }

  await tx
    .update(groupChangeRequest)
    .set({
      status: "admin_rejected",
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: new Date(),
      rejectionReason: input.rejectionReason,
      updatedAt: new Date(),
    })
    .where(eq(groupChangeRequest.id, input.requestId));

  await recordAudit(tx, {
    action: "group_change.reject",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "group_change_request",
    targetId: input.requestId,
    targetLabel: input.requestId,
    metadata: { rejectionReason: input.rejectionReason },
  });

  const notifData = await loadNotificationData(
    input.organizationId,
    input.requestId,
  );
  if (notifData) {
    await emitDomainNotification(tx, {
      eventType: "group-change-rejected",
      organizationId: input.organizationId,
      accountId: null,
      recipients: [{
        kind: "client",
        clientId: notifData.clientId,
        email: notifData.clientEmail,
        locale: "pl",
      }],
      params: {
        athleteName: notifData.athleteName,
        sourceGroupName: notifData.sourceGroupName,
        targetGroupName: notifData.targetGroupName,
        reason: input.rejectionReason,
      },
      dedupeBasis: `group-change-rejected:${input.requestId}`,
    });
  }
}
