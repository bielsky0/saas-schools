"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { trainerAvailability } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { findOverlappingWindow, getAvailability } from "./availability-data";
import { availabilitySchema, updateAvailabilitySchema } from "./availability-schema";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function createAvailabilityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("trainer_availability.manage");
  const t = await getTranslations("staffPanel");

  const parsed = availabilitySchema.safeParse({
    trainerId: str(formData.get("trainerId")),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: str(formData.get("startTime")),
    endTime: str(formData.get("endTime")),
    locationId: str(formData.get("locationId")) || undefined,
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const effectiveRole = ctx.membership?.role;
  if (effectiveRole === "trainer" && parsed.data.trainerId !== ctx.session.user.id) {
    return { error: t("errors.generic") };
  }

  const check = await withTenant(ctx.org.id, async (tx) => {
    const existing = await tx
      .select({ id: trainerAvailability.id })
      .from(trainerAvailability)
      .where(
        and(
          eq(trainerAvailability.organizationId, ctx.org.id),
          eq(trainerAvailability.trainerId, parsed.data.trainerId),
          eq(trainerAvailability.dayOfWeek, parsed.data.dayOfWeek),
        ),
      )
      .limit(1);
    if (!existing[0]) return null;

    const overlap = await findOverlappingWindow(
      tx,
      ctx.org.id,
      parsed.data.trainerId,
      parsed.data.dayOfWeek,
      parsed.data.startTime,
      parsed.data.endTime,
    );
    if (overlap) return "This window overlaps an existing one." as const;
    return null;
  });
  if (check) {
    return { error: check };
  }

  await withTenant(ctx.org.id, (tx) =>
    tx.insert(trainerAvailability).values({
      organizationId: ctx.org.id,
      trainerId: parsed.data.trainerId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      locationId: parsed.data.locationId ?? null,
      isActive: parsed.data.isActive ?? true,
    }),
  );

  revalidatePath("/dashboard/trainers");
  return { success: t("availabilityCreated" as Parameters<typeof t>[0], { defaultValue: "Availability window created." }) };
}

export async function updateAvailabilityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("trainer_availability.manage");
  const t = await getTranslations("staffPanel");

  const id = str(formData.get("id"));
  if (!id) return { error: t("errors.generic") };

  const parsed = updateAvailabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: str(formData.get("startTime")) || undefined,
    endTime: str(formData.get("endTime")) || undefined,
    locationId: str(formData.get("locationId")) || undefined,
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const check = await withTenant(ctx.org.id, async (tx) => {
    const existing = await getAvailability(tx, ctx.org.id, id);
    if (!existing) return "Availability window not found." as const;

    const effectiveRole = ctx.membership?.role;
    if (effectiveRole === "trainer" && existing.trainerId !== ctx.session.user.id) {
      return "You may only update your own windows." as const;
    }

    const effectiveDay = parsed.data.dayOfWeek ?? existing.dayOfWeek;
    const effectiveStart = parsed.data.startTime ?? existing.startTime;
    const effectiveEnd = parsed.data.endTime ?? existing.endTime;

    const overlap = await findOverlappingWindow(
      tx,
      ctx.org.id,
      existing.trainerId,
      effectiveDay,
      effectiveStart,
      effectiveEnd,
      id,
    );
    if (overlap) return "This window overlaps an existing one." as const;

    return null;
  });
  if (check) {
    return { error: check };
  }

  const updateValues: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.dayOfWeek !== undefined) updateValues.dayOfWeek = parsed.data.dayOfWeek;
  if (parsed.data.startTime !== undefined) updateValues.startTime = parsed.data.startTime;
  if (parsed.data.endTime !== undefined) updateValues.endTime = parsed.data.endTime;
  if (parsed.data.isActive !== undefined) updateValues.isActive = parsed.data.isActive;
  if (parsed.data.locationId !== undefined) updateValues.locationId = parsed.data.locationId || null;

  await withTenant(ctx.org.id, (tx) =>
    tx
      .update(trainerAvailability)
      .set(updateValues)
      .where(and(eq(trainerAvailability.id, id), eq(trainerAvailability.organizationId, ctx.org.id))),
  );

  revalidatePath("/dashboard/trainers");
  return { success: t("availabilityUpdated" as Parameters<typeof t>[0], { defaultValue: "Availability window updated." }) };
}

export async function deleteAvailabilityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("trainer_availability.manage");
  const t = await getTranslations("staffPanel");

  const id = str(formData.get("id"));
  if (!id) return { error: t("errors.generic") };

  const check = await withTenant(ctx.org.id, async (tx) => {
    const existing = await getAvailability(tx, ctx.org.id, id);
    if (!existing) return "Availability window not found." as const;

    const effectiveRole = ctx.membership?.role;
    if (effectiveRole === "trainer" && existing.trainerId !== ctx.session.user.id) {
      return "You may only delete your own windows." as const;
    }
    return null;
  });
  if (check) {
    return { error: check };
  }

  await withTenant(ctx.org.id, (tx) =>
    tx
      .delete(trainerAvailability)
      .where(and(eq(trainerAvailability.id, id), eq(trainerAvailability.organizationId, ctx.org.id))),
  );

  revalidatePath("/dashboard/trainers");
  return { success: "Availability window deleted." };
}
