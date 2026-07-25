import { and, asc, eq, ne } from "drizzle-orm";

import { trainerAvailability } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export interface AvailabilityRow {
  id: string;
  organizationId: string;
  trainerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Check whether two `HH:MM` time ranges overlap (half-open: [start, end)).
 */
function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && endA > startB;
}

export async function createAvailability(
  tx: TenantDb,
  values: {
    organizationId: string;
    trainerId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    locationId?: string | null;
    isActive?: boolean;
  },
): Promise<AvailabilityRow> {
  const [row] = await tx
    .insert(trainerAvailability)
    .values({
      organizationId: values.organizationId,
      trainerId: values.trainerId,
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      locationId: values.locationId ?? null,
      isActive: values.isActive ?? true,
    })
    .returning();
  if (!row) throw new Error("createAvailability: insert returned no row");
  return row;
}

export async function updateAvailability(
  tx: TenantDb,
  organizationId: string,
  id: string,
  values: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    locationId?: string | null;
    isActive?: boolean;
  },
): Promise<AvailabilityRow | null> {
  const [row] = await tx
    .update(trainerAvailability)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(trainerAvailability.id, id), eq(trainerAvailability.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

export async function deleteAvailability(
  tx: TenantDb,
  organizationId: string,
  id: string,
): Promise<void> {
  await tx
    .delete(trainerAvailability)
    .where(and(eq(trainerAvailability.id, id), eq(trainerAvailability.organizationId, organizationId)));
}

export async function getAvailability(
  tx: TenantDb,
  organizationId: string,
  id: string,
): Promise<AvailabilityRow | null> {
  const [row] = await tx
    .select()
    .from(trainerAvailability)
    .where(and(eq(trainerAvailability.id, id), eq(trainerAvailability.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function listAvailability(
  tx: TenantDb,
  organizationId: string,
  options?: { trainerId?: string; dayOfWeek?: number },
): Promise<AvailabilityRow[]> {
  const conditions = [eq(trainerAvailability.organizationId, organizationId)];
  if (options?.trainerId) {
    conditions.push(eq(trainerAvailability.trainerId, options.trainerId));
  }
  if (options?.dayOfWeek !== undefined) {
    conditions.push(eq(trainerAvailability.dayOfWeek, options.dayOfWeek));
  }
  return tx
    .select()
    .from(trainerAvailability)
    .where(and(...conditions))
    .orderBy(asc(trainerAvailability.dayOfWeek), asc(trainerAvailability.startTime));
}

/**
 * Check whether a proposed window overlaps any EXISTING active window for the
 * same trainer+dayOfWeek. Pass `excludeId` on update to skip the row being
 * updated (otherwise every update would find "overlap" with itself).
 */
export async function findOverlappingWindow(
  tx: TenantDb,
  organizationId: string,
  trainerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string,
): Promise<AvailabilityRow | null> {
  const conditions = [
    eq(trainerAvailability.organizationId, organizationId),
    eq(trainerAvailability.trainerId, trainerId),
    eq(trainerAvailability.dayOfWeek, dayOfWeek),
    eq(trainerAvailability.isActive, true),
  ];
  if (excludeId) {
    conditions.push(ne(trainerAvailability.id, excludeId));
  }
  const rows = await tx
    .select()
    .from(trainerAvailability)
    .where(and(...conditions));
  for (const row of rows) {
    if (timeRangesOverlap(startTime, endTime, row.startTime, row.endTime)) {
      return row;
    }
  }
  return null;
}
