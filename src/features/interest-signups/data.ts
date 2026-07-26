import { and, count, eq, isNull } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import { athlete, client, groupType, interestSignup } from "@/lib/db/schema";

/** A client-facing row, joined for admin display. */
export interface InterestSignupRow {
  id: string;
  organizationId: string;
  groupTypeId: string;
  groupTypeName: string;
  clientId: string;
  clientEmail: string;
  clientName: string | null;
  athleteId: string;
  athleteName: string;
  convertedBookingId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
}

/** List all unconverted interest signups for a group type. */
export async function listInterestSignups(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
): Promise<InterestSignupRow[]> {
  const rows = await tx
    .select({
      id: interestSignup.id,
      organizationId: interestSignup.organizationId,
      groupTypeId: interestSignup.groupTypeId,
      groupTypeName: groupType.name,
      clientId: interestSignup.clientId,
      clientEmail: client.email,
      clientName: client.name,
      athleteId: interestSignup.athleteId,
      athleteName: athlete.name,
      convertedBookingId: interestSignup.convertedBookingId,
      convertedAt: interestSignup.convertedAt,
      createdAt: interestSignup.createdAt,
    })
    .from(interestSignup)
    .innerJoin(groupType, and(
      eq(groupType.id, interestSignup.groupTypeId),
      eq(groupType.organizationId, interestSignup.organizationId),
    ))
    .innerJoin(client, and(
      eq(client.id, interestSignup.clientId),
      eq(client.organizationId, interestSignup.organizationId),
    ))
    .innerJoin(athlete, and(
      eq(athlete.id, interestSignup.athleteId),
      eq(athlete.organizationId, interestSignup.organizationId),
    ))
    .where(
      and(
        eq(interestSignup.organizationId, organizationId),
        eq(interestSignup.groupTypeId, groupTypeId),
        isNull(interestSignup.convertedBookingId),
      ),
    )
    .orderBy(interestSignup.createdAt);

  return rows;
}

/** Check whether an interest_signup already exists for this child+offer (Constraint 13). */
export async function findInterestSignup(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
  athleteId: string,
) {
  const [row] = await tx
    .select()
    .from(interestSignup)
    .where(
      and(
        eq(interestSignup.organizationId, organizationId),
        eq(interestSignup.groupTypeId, groupTypeId),
        eq(interestSignup.athleteId, athleteId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Get a single interest signup by id. */
export async function getInterestSignup(
  tx: TenantDb,
  organizationId: string,
  id: string,
) {
  const [row] = await tx
    .select()
    .from(interestSignup)
    .where(
      and(
        eq(interestSignup.id, id),
        eq(interestSignup.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Count unconverted interest signups for a group type. */
export async function countInterestSignups(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(interestSignup)
    .where(
      and(
        eq(interestSignup.organizationId, organizationId),
        eq(interestSignup.groupTypeId, groupTypeId),
        isNull(interestSignup.convertedBookingId),
      ),
    );
  return row?.value ?? 0;
}

/** Insert an interest signup (Constraint 13 enforced by unique index). */
export async function insertInterestSignup(
  tx: TenantDb,
  params: {
    organizationId: string;
    groupTypeId: string;
    clientId: string;
    athleteId: string;
  },
) {
  const [row] = await tx
    .insert(interestSignup)
    .values({
      organizationId: params.organizationId,
      groupTypeId: params.groupTypeId,
      clientId: params.clientId,
      athleteId: params.athleteId,
    })
    .returning();
  return row;
}
