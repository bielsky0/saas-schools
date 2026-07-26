import { and, eq } from "drizzle-orm";

import { qualificationCard } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * Data access for qualification cards (Faza 26, §2.40, EPIK 41).
 *
 * The card is a "living document" — edited in-place, not versioned.
 * Constraint 16: unique (group_type_id, athlete_id) — one card per
 * athlete per camp offer.
 *
 * Health fields (chronic_conditions, medications, allergies, vaccinations_info,
 * health_during_camp) are gated behind `athlete_health.view`. Callers must
 * check permission BEFORE reading these fields — this module reads them
 * unconditionally. See actions.ts for the gate.
 */

export async function getQualificationCard(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
  athleteId: string,
) {
  const [row] = await tx
    .select()
    .from(qualificationCard)
    .where(
      and(
        eq(qualificationCard.organizationId, organizationId),
        eq(qualificationCard.groupTypeId, groupTypeId),
        eq(qualificationCard.athleteId, athleteId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getQualificationCardById(
  tx: TenantDb,
  organizationId: string,
  id: string,
) {
  const [row] = await tx
    .select()
    .from(qualificationCard)
    .where(
      and(
        eq(qualificationCard.id, id),
        eq(qualificationCard.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listQualificationCards(
  tx: TenantDb,
  organizationId: string,
  opts?: {
    groupTypeId?: string;
    status?: "parent_pending" | "parent_completed" | "leader_completed";
  },
) {
  const conditions = [
    eq(qualificationCard.organizationId, organizationId),
  ];
  if (opts?.groupTypeId) {
    conditions.push(eq(qualificationCard.groupTypeId, opts.groupTypeId));
  }
  if (opts?.status) {
    conditions.push(eq(qualificationCard.status, opts.status));
  }
  return tx
    .select()
    .from(qualificationCard)
    .where(and(...conditions))
    .orderBy(qualificationCard.createdAt);
}

export async function upsertQualificationCard(
  tx: TenantDb,
  values: {
    organizationId: string;
    athleteId: string;
    groupTypeId: string;
    chronicConditions?: string | null;
    medications?: string | null;
    allergies?: string | null;
    dietaryRestrictions?: string | null;
    vaccinationsInfo?: string | null;
    parentContactDuringCamp?: string | null;
  },
) {
  const existing = await getQualificationCard(
    tx,
    values.organizationId,
    values.groupTypeId,
    values.athleteId,
  );

  if (existing) {
    const [updated] = await tx
      .update(qualificationCard)
      .set({
        chronicConditions: values.chronicConditions ?? null,
        medications: values.medications ?? null,
        allergies: values.allergies ?? null,
        dietaryRestrictions: values.dietaryRestrictions ?? null,
        vaccinationsInfo: values.vaccinationsInfo ?? null,
        parentContactDuringCamp: values.parentContactDuringCamp ?? null,
        status: "parent_completed",
      })
      .where(
        and(
          eq(qualificationCard.id, existing.id),
          eq(qualificationCard.organizationId, values.organizationId),
        ),
      )
      .returning();
    if (!updated) throw new Error("upsertQualificationCard: update returned no row");
    return updated;
  }

  const [row] = await tx
    .insert(qualificationCard)
    .values({
      organizationId: values.organizationId,
      athleteId: values.athleteId,
      groupTypeId: values.groupTypeId,
      chronicConditions: values.chronicConditions ?? null,
      medications: values.medications ?? null,
      allergies: values.allergies ?? null,
      dietaryRestrictions: values.dietaryRestrictions ?? null,
      vaccinationsInfo: values.vaccinationsInfo ?? null,
      parentContactDuringCamp: values.parentContactDuringCamp ?? null,
      status: "parent_completed",
    })
    .returning();
  if (!row) throw new Error("upsertQualificationCard: insert returned no row");
  return row;
}

export async function completeLeaderPhase(
  tx: TenantDb,
  values: {
    organizationId: string;
    id: string;
    healthDuringCamp?: string | null;
    incidents?: string | null;
    completedByUserId: string;
  },
) {
  const [updated] = await tx
    .update(qualificationCard)
    .set({
      healthDuringCamp: values.healthDuringCamp ?? null,
      incidents: values.incidents ?? null,
      completedByUserId: values.completedByUserId,
      leaderSignedAt: new Date(),
      status: "leader_completed",
    })
    .where(
      and(
        eq(qualificationCard.id, values.id),
        eq(qualificationCard.organizationId, values.organizationId),
      ),
    )
    .returning();
  if (!updated) throw new Error("completeLeaderPhase: update returned no row");
  return updated;
}

export async function setQualificationCardFileId(
  tx: TenantDb,
  organizationId: string,
  id: string,
  fileId: string,
) {
  await tx
    .update(qualificationCard)
    .set({ fileId })
    .where(
      and(
        eq(qualificationCard.id, id),
        eq(qualificationCard.organizationId, organizationId),
      ),
    );
}
