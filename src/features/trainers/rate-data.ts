import { and, desc, eq } from "drizzle-orm";

import { trainerRate } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export interface TrainerRateRow {
  id: string;
  organizationId: string;
  trainerId: string;
  groupTypeId: string | null;
  amount: number;
  effectiveFrom: Date;
  rateType: "flat_per_session" | "hourly";
  createdAt: Date;
}

export type CreateRateInput = {
  organizationId: string;
  trainerId: string;
  groupTypeId?: string | null;
  amount: number;
  effectiveFrom: Date;
  rateType?: "flat_per_session" | "hourly";
};

/** List all rates for an organization, newest first. */
export async function listRates(
  tx: TenantDb,
  organizationId: string,
  options?: { trainerId?: string },
): Promise<TrainerRateRow[]> {
  const conditions = [eq(trainerRate.organizationId, organizationId)];
  if (options?.trainerId) {
    conditions.push(eq(trainerRate.trainerId, options.trainerId));
  }

  return tx
    .select()
    .from(trainerRate)
    .where(and(...conditions))
    .orderBy(desc(trainerRate.effectiveFrom));
}

/** Get one rate by id + org. */
export async function getRate(
  tx: TenantDb,
  organizationId: string,
  id: string,
): Promise<TrainerRateRow | null> {
  const [row] = await tx
    .select()
    .from(trainerRate)
    .where(and(eq(trainerRate.id, id), eq(trainerRate.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/**
 * Create a new trainer rate (INSERT only — changes create a new row with own
 * effective_from, never UPDATE).
 */
export async function createRate(
  tx: TenantDb,
  input: CreateRateInput,
): Promise<TrainerRateRow> {
  const [row] = await tx
    .insert(trainerRate)
    .values({
      organizationId: input.organizationId,
      trainerId: input.trainerId,
      groupTypeId: input.groupTypeId ?? null,
      amount: input.amount,
      effectiveFrom: input.effectiveFrom,
      rateType: input.rateType ?? "flat_per_session",
    })
    .returning();

  if (!row) throw new Error("createRate: insert returned no row");
  return row;
}

/** Delete a rate by id + org. */
export async function deleteRate(
  tx: TenantDb,
  organizationId: string,
  id: string,
): Promise<void> {
  await tx
    .delete(trainerRate)
    .where(and(eq(trainerRate.id, id), eq(trainerRate.organizationId, organizationId)));
}
