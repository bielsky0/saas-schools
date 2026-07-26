"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { resolveActor, recordAudit } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { classSession, groupType as groupTypeTable, location } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { SQLSTATE_EXCLUSION_VIOLATION, sqlStateOf } from "@/lib/db/sql-error";
import { wallClockToInstant } from "@/lib/datetime";
import type { FormState } from "@/lib/validation";
import { createBooking, UnknownSessionError, SessionFullError } from "./create";

/**
 * Slot-First booking action (F18, §2.1).
 *
 * Creates a session on-the-fly and a booking in a single transaction.
 * Trainer conflict is resolved solely by the §5.1 EXCLUDE constraint.
 * Session capacity defaults to `group_type.defaultCapacity` (enforced ≤ 1).
 */

const createSlotFirstSchema = z.object({
  groupTypeId: z.string().min(1),
  trainerId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  locationId: z.string().nullable().optional(),
  athleteId: z.string().min(1),
  clientId: z.string().min(1),
});

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function createSlotFirstBookingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState & { bookingId?: string }> {
  const ctx = await requireOrgPermission("sessions.manage");
  const t = await getTranslations("schedule");

  const rawStart = str(formData.get("startTime"));
  const rawEnd = str(formData.get("endTime"));

  const parsed = createSlotFirstSchema.safeParse({
    groupTypeId: str(formData.get("groupTypeId")),
    trainerId: str(formData.get("trainerId")),
    startTime: rawStart ? wallClockToInstant(rawStart, ctx.org.timezone) : undefined,
    endTime: rawEnd ? wallClockToInstant(rawEnd, ctx.org.timezone) : undefined,
    locationId: str(formData.get("locationId")) || null,
    athleteId: str(formData.get("athleteId")),
    clientId: str(formData.get("clientId")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    const result = await withTenant(ctx.org.id, async (tx) => {
      const [gt] = await tx
        .select({
          engine: groupTypeTable.engine,
          defaultDurationMinutes: groupTypeTable.defaultDurationMinutes,
          defaultCapacity: groupTypeTable.defaultCapacity,
          price: groupTypeTable.price,
          paymentPolicy: groupTypeTable.paymentPolicy,
          allowedPurchaseModes: groupTypeTable.allowedPurchaseModes,
          defaultLocationId: groupTypeTable.defaultLocationId,
        })
        .from(groupTypeTable)
        .where(
          and(
            eq(groupTypeTable.id, parsed.data.groupTypeId),
            eq(groupTypeTable.organizationId, ctx.org.id),
            isNull(groupTypeTable.deletedAt),
          ),
        )
        .limit(1);
      if (!gt) throw new Error("group_type not found");
      if (gt.engine !== "slot_first") throw new Error("wrong engine");

      const durationMinutes =
        gt.defaultDurationMinutes ??
        Math.round(
          (parsed.data.endTime.getTime() - parsed.data.startTime.getTime()) / 60000,
        );
      const capacity = gt.defaultCapacity ?? 1;
      const locId = parsed.data.locationId ?? gt.defaultLocationId ?? null;

      if (locId) {
        const [loc] = await tx
          .select({ id: location.id })
          .from(location)
          .where(and(eq(location.id, locId), eq(location.organizationId, ctx.org.id)))
          .limit(1);
        if (!loc) throw new Error("location not found");
      }

      const endTime = new Date(parsed.data.startTime.getTime() + durationMinutes * 60000);

      const [sessionRow] = await tx
        .insert(classSession)
        .values({
          organizationId: ctx.org.id,
          groupTypeId: parsed.data.groupTypeId,
          trainerId: parsed.data.trainerId,
          startTime: parsed.data.startTime,
          endTime,
          capacity,
          locationId: locId,
        })
        .returning({ id: classSession.id });
      if (!sessionRow) throw new Error("session insert failed");

      const booking = await createBooking(tx, {
        organizationId: ctx.org.id,
        groupType: {
          id: parsed.data.groupTypeId,
          price: gt.price,
          paymentPolicy: gt.paymentPolicy,
          allowedPurchaseModes: gt.allowedPurchaseModes,
          requiresQualificationCard: false,
        },
        currency: ctx.org.currency,
        client: { id: parsed.data.clientId, email: actor.actorEmail },
        sessionId: sessionRow.id,
        paymentMethod: "on_site",
        participant: { kind: "existing", athleteId: parsed.data.athleteId },
        onlineAvailable: false,
      });

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "class_session.create",
        targetType: "class_session",
        targetId: sessionRow.id,
        targetLabel: parsed.data.startTime.toISOString(),
        metadata: { groupTypeId: parsed.data.groupTypeId, engine: "slot_first" },
      });

      return booking;
    });

    revalidatePath(`/dashboard/schedule`);
    return { success: t("created"), bookingId: result.bookingId };
  } catch (error) {
    if (error instanceof UnknownSessionError) return { error: t("errors.notFound") };
    if (error instanceof SessionFullError) return { error: t("errors.createFailed") };
    if (sqlStateOf(error) === SQLSTATE_EXCLUSION_VIOLATION) {
      return { error: t("errors.trainerConflict") };
    }
    throw error;
  }
}
