import { and, eq, inArray } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { emitDomainNotification } from "@/features/notifications/emit";
import { athlete, client, credit } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export class CreditNotFoundError extends Error {
  constructor(msg?: string) {
    super(msg ?? "Credit not found");
    this.name = "CreditNotFoundError";
  }
}

export class CreditNotTransferableError extends Error {
  constructor(reason: string) {
    super(`Credit is not transferable: ${reason}`);
    this.name = "CreditNotTransferableError";
  }
}

export class AthleteMismatchError extends Error {
  constructor() {
    super("Both athletes must belong to the same parent client");
    this.name = "AthleteMismatchError";
  }
}

export class SameAthleteError extends Error {
  constructor() {
    super("Source and target athlete must be different");
    this.name = "SameAthleteError";
  }
}

export interface TransferCreditInput {
  organizationId: string;
  creditId: string;
  sourceAthleteId: string;
  targetAthleteId: string;
  actor: AuditActor;
  requestedByClientId?: string;
}

/**
 * Transfer a credit from one child to another (US-7.5).
 *
 * Walidacje:
 *   1. Credit istnieje, jest dostępny, nie skonsumowany
 *   2. Nie jest family credit (athleteId != null)
 *   3. Oboje dzieci należą do tego samego rodzica
 *   4. To nie to samo dziecko
 *
 * Lock ordering: credit first, then athletes sorted by id (deadlock prevention).
 */
export async function transferCredit(
  tx: TenantDb,
  input: TransferCreditInput,
): Promise<void> {
  if (input.sourceAthleteId === input.targetAthleteId) {
    throw new SameAthleteError();
  }

  const [creditRow] = await tx
    .select({
      id: credit.id,
      organizationId: credit.organizationId,
      athleteId: credit.athleteId,
      status: credit.status,
      clientId: credit.clientId,
      usedInBookingId: credit.usedInBookingId,
    })
    .from(credit)
    .where(
      and(
        eq(credit.id, input.creditId),
        eq(credit.organizationId, input.organizationId),
      ),
    )
    .limit(1)
    .for("update");

  if (!creditRow) throw new CreditNotFoundError();
  if (creditRow.status !== "available") {
    throw new CreditNotTransferableError(`status is ${creditRow.status}`);
  }
  if (creditRow.usedInBookingId) {
    throw new CreditNotTransferableError("already consumed by a booking");
  }
  if (!creditRow.athleteId) {
    throw new CreditNotTransferableError("family credit does not need transfer");
  }

  const athleteIds = [input.sourceAthleteId, input.targetAthleteId].sort();

  const athletes = await tx
    .select({
      id: athlete.id,
      parentClientId: athlete.parentClientId,
      name: athlete.name,
    })
    .from(athlete)
    .where(
      and(
        eq(athlete.organizationId, input.organizationId),
        inArray(athlete.id, athleteIds),
      ),
    )
    .for("update");

  const sourceAth = athletes.find((a) => a.id === input.sourceAthleteId);
  const targetAth = athletes.find((a) => a.id === input.targetAthleteId);

  if (!sourceAth || !targetAth) {
    throw new CreditNotFoundError("Athlete not found");
  }

  if (sourceAth.parentClientId !== targetAth.parentClientId) {
    throw new AthleteMismatchError();
  }

  if (creditRow.clientId !== sourceAth.parentClientId) {
    throw new CreditNotTransferableError("credit does not belong to this client");
  }
  if (creditRow.athleteId !== input.sourceAthleteId) {
    throw new CreditNotTransferableError("credit is not assigned to the source athlete");
  }

  await tx
    .update(credit)
    .set({
      athleteId: input.targetAthleteId,
      updatedAt: new Date(),
    })
    .where(eq(credit.id, input.creditId));

  await recordAudit(tx, {
    action: "credit.reassign",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "credit",
    targetId: input.creditId,
    targetLabel: input.creditId,
    metadata: {
      sourceAthleteId: input.sourceAthleteId,
      targetAthleteId: input.targetAthleteId,
      requestedByClientId: input.requestedByClientId ?? null,
    },
  });

  const [parent] = await tx
    .select({ id: client.id, email: client.email })
    .from(client)
    .where(
      and(
        eq(client.id, sourceAth.parentClientId),
        eq(client.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (parent) {
    await emitDomainNotification(tx, {
      eventType: "credit-transfer-completed",
      organizationId: input.organizationId,
      accountId: null,
      recipients: [{
        kind: "client",
        clientId: parent.id,
        email: parent.email,
        locale: "pl",
      }],
      params: {
        sourceAthleteName: sourceAth.name,
        targetAthleteName: targetAth.name,
      },
      dedupeBasis: `credit-transfer:${input.creditId}`,
    });
  }
}
