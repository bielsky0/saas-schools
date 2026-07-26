"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { changed, recordAudit, resolveActor, withImpersonation } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { groupType as groupTypeTable, classSession, location } from "@/lib/db/schema";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import { SQLSTATE_EXCLUSION_VIOLATION, sqlStateOf } from "@/lib/db/sql-error";
import { wallClockToInstant } from "@/lib/datetime";
import type { FormState } from "@/lib/validation";
import {
  SessionAlreadyCancelledError,
  SessionNotFoundError as CancelSessionNotFoundError,
  cancelClassSession,
} from "./cancel-session";
import { createSessionSchema, updateSessionSchema } from "./schema";
import { massReassignTrainer } from "./mass-reassign-trainer";
import {
  MassMoveDifferentGroupTypeError,
  MassMoveSessionNotFoundError,
  MassMoveTargetCancelledError,
  MassMoveTargetPastError,
  MassMoveTargetSameAsSourceError,
  massMoveBookings,
} from "./mass-move-bookings";
import {
  NewTrainerSameAsCurrentError,
  SessionAlreadyCancelledError as SubstituteAlreadyCancelledError,
  SessionNotFoundError as SubstituteSessionNotFoundError,
  SessionPastError,
  TrainerCollisionError,
  substituteTrainerInSession,
} from "./substitute-trainer";

/**
 * Per-session edits (langlion §3.4/AC9, US-22.3, US-14.4).
 *
 * The Realisation half. An admin reaches for this when one date needs to differ
 * from its pattern: the hall is double-booked that week, or one more child has to
 * fit. Three fields, and each is a different user story.
 *
 * WHAT SETTING `isManuallyAdjusted` MEANS. Editing the time or the location marks
 * the row, so a later bulk update from the pattern skips it (§3.4/AC8) — that is
 * the flag's entire purpose: it records "a human decided this specific date is
 * different", so that a subsequent season-wide edit cannot silently undo them.
 *
 * CAPACITY DOES NOT SET IT, and the asymmetry is deliberate. Raising capacity is
 * the one legitimate way to admit an extra participant to a full session
 * (US-14.4/AC1), and it says nothing about when or where the class happens — so
 * a pattern edit that moves the season should still move this session. Marking it
 * would quietly exclude the row from future schedule changes as a side effect of
 * an unrelated decision.
 *
 * There is NO capacity override anywhere in this file, and none exists in the
 * system: raising the number is the legitimate path, and no role may exceed the
 * number that is there (US-14.2/AC3, US-14.5/AC2).
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function updateSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionId = str(formData.get("sessionId"));
  const ctx = await requireOrgPermission("sessions.manage");
  const [t, tv] = await Promise.all([
    getTranslations("schedule"),
    getTranslations("schedule.validation"),
  ]);

  const rawStart = str(formData.get("startTime"));
  const rawEnd = str(formData.get("endTime"));
  const rawLocation = str(formData.get("locationId"));
  const rawCapacity = str(formData.get("capacity"));

  const parsed = updateSessionSchema(tv).safeParse({
    // Converted HERE, not by `z.coerce.date()`. The form posts a naive wall clock
    // ("2026-08-13T18:00") because `datetime-local` carries no zone, and
    // `new Date()` on such a string resolves it in the SERVER's zone — which is
    // UTC on Vercel and something else on a laptop. The academy's zone is the
    // only correct reading, and getting this wrong is silent: every session lands
    // an offset away, consistently enough to look deliberate.
    startTime: rawStart ? wallClockToInstant(rawStart, ctx.org.timezone) : undefined,
    endTime: rawEnd ? wallClockToInstant(rawEnd, ctx.org.timezone) : undefined,
    // Distinguishes "clear the location" (empty string posted) from "leave it
    // alone" (field absent) — `nullish` in the schema accepts both, and the two
    // mean different things to an admin who deliberately blanked the field.
    locationId: formData.has("locationId") ? rawLocation || null : undefined,
    capacity: rawCapacity || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);
  const movedInTimeOrSpace =
    parsed.data.startTime !== undefined || parsed.data.locationId !== undefined;

  const doUpdate = async (tx: TenantDb, forceOverride: boolean) => {
    const [before] = await tx
      .select()
      .from(classSession)
      .where(and(eq(classSession.id, sessionId), eq(classSession.organizationId, ctx.org.id)))
      .limit(1)
      .for("update");
    if (!before) return "not-found" as const;

    if (!forceOverride && parsed.data.locationId) {
      const [row] = await tx
        .select({ id: location.id })
        .from(location)
        .where(
          and(eq(location.id, parsed.data.locationId), eq(location.organizationId, ctx.org.id)),
        )
        .limit(1);
      if (!row) return "not-found" as const;
    }

    const after = {
      startTime: parsed.data.startTime ?? before.startTime,
      endTime: parsed.data.endTime ?? before.endTime,
      locationId:
        parsed.data.locationId === undefined ? before.locationId : parsed.data.locationId,
      capacity: parsed.data.capacity ?? before.capacity,
      isManuallyAdjusted: before.isManuallyAdjusted || (movedInTimeOrSpace && !forceOverride),
    };

    if (forceOverride) {
      await tx
        .update(classSession)
        .set({ forceOverride: true })
        .where(and(eq(classSession.id, sessionId), eq(classSession.organizationId, ctx.org.id)));
    }

    await tx
      .update(classSession)
      .set({ ...after, updatedAt: new Date() })
      .where(and(eq(classSession.id, sessionId), eq(classSession.organizationId, ctx.org.id)));

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: forceOverride ? "session.force_override" : "class_session.update",
      targetType: "class_session",
      targetId: sessionId,
      targetLabel: before.startTime.toISOString(),
      metadata: withImpersonation(ctx.session, {
        changes: changed(before, after, [
          "startTime",
          "endTime",
          "locationId",
          "capacity",
          "isManuallyAdjusted",
        ]),
        ...(forceOverride ? { forceOverride: true } : {}),
      }),
    });

    return "ok" as const;
  };

  let outcome: "ok" | "not-found" | "trainer-conflict";
  try {
    outcome = await withTenant(ctx.org.id, (tx) => doUpdate(tx, false));
  } catch (error) {
    if (sqlStateOf(error) !== SQLSTATE_EXCLUSION_VIOLATION) throw error;

    if (ctx.effectivePermissions.has("sessions.force_override") && movedInTimeOrSpace) {
      try {
        outcome = await withTenant(ctx.org.id, (tx) => doUpdate(tx, true));
      } catch (retryError) {
        if (sqlStateOf(retryError) === SQLSTATE_EXCLUSION_VIOLATION) {
          return { error: t("errors.trainerConflict") };
        }
        throw retryError;
      }
    } else {
      return { error: t("errors.trainerConflict") };
    }
  }

  if (outcome === "not-found") return { error: t("errors.notFound") };

  revalidatePath(`/dashboard/schedule`);
  return { success: t("updated") };
}

export async function cancelSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("sessions.manage");
  const t = await getTranslations("schedule");
  const sessionId = str(formData.get("sessionId"));
  if (!sessionId) return { error: t("errors.generic") };

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, (tx) =>
      cancelClassSession(tx, {
        organizationId: ctx.org.id,
        sessionId,
        timeZone: ctx.org.timezone,
        actor,
      }),
    );
  } catch (error) {
    if (error instanceof CancelSessionNotFoundError) return { error: t("errors.notFound") };
    if (error instanceof SessionAlreadyCancelledError) return { error: t("errors.generic") };
    throw error;
  }

  revalidatePath(`/dashboard/schedule`);
  revalidatePath(`/dashboard/sessions/${sessionId}`);
  return { success: t("sessionCancelled") };
}

export async function substituteTrainerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionId = str(formData.get("sessionId"));
  const rawTrainer = str(formData.get("trainerId"));
  const ctx = await requireOrgPermission("sessions.manage");
  const t = await getTranslations("schedule");

  const newTrainerId = rawTrainer || null;
  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, (tx) =>
      substituteTrainerInSession(tx, {
        organizationId: ctx.org.id,
        sessionId,
        newTrainerId,
        actor,
      }),
    );

    revalidatePath(`/dashboard/schedule`);
    revalidatePath(`/dashboard/sessions/${sessionId}`);
    return { success: t("trainerSubstituted") };
  } catch (e) {
    if (e instanceof SubstituteSessionNotFoundError) return { error: t("errors.notFound") };
    if (e instanceof SubstituteAlreadyCancelledError) return { error: t("errors.generic") };
    if (e instanceof SessionPastError) return { error: t("errors.generic") };
    if (e instanceof TrainerCollisionError) return { error: t("substituteConflict") };
    if (e instanceof NewTrainerSameAsCurrentError) return { error: t("errors.generic") };
    throw e;
  }
}

/**
 * Mass reassign trainer for all future sessions (langlion US-21.3, Faza 8).
 * Each session in its own savepoint — one collision skips only that session.
 */
export async function massReassignTrainerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const fromTrainerId = str(formData.get("fromTrainerId"));
  const targetTrainerId = str(formData.get("targetTrainerId"));
  const ctx = await requireOrgPermission("sessions.mass_reassign_trainer");
  const t = await getTranslations("schedule");

  if (!fromTrainerId || !targetTrainerId) return { error: t("errors.generic") };
  const actor = await resolveActor(ctx.session);

  try {
    const result = await withTenant(ctx.org.id, (tx) =>
      massReassignTrainer(tx, {
        organizationId: ctx.org.id,
        fromTrainerId,
        targetTrainerId,
        actor,
      }),
    );

    revalidatePath(`/dashboard/schedule`);
    const msg = result.skippedTrainerConflict > 0
      ? t("massReassigned") + " " + t("massReassignReport", { updated: result.updated, skipped: result.skippedTrainerConflict })
      : t("massReassigned");
    return { success: msg };
  } catch (e) {
    if (e instanceof SubstituteSessionNotFoundError) return { error: t("errors.notFound") };
    throw e;
  }
}

/** Cancel a session by moving all bookings to another session (US-21.4). */
export async function massMoveBookingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sourceSessionId = str(formData.get("sourceSessionId"));
  const targetSessionId = str(formData.get("targetSessionId"));
  const ctx = await requireOrgPermission("sessions.mass_move_bookings");
  const t = await getTranslations("schedule");

  if (!sourceSessionId || !targetSessionId) return { error: t("errors.generic") };
  const actor = await resolveActor(ctx.session);

  try {
    const result = await withTenant(ctx.org.id, (tx) =>
      massMoveBookings(tx, {
        organizationId: ctx.org.id,
        sourceSessionId,
        targetSessionId,
        actor,
      }),
    );

    revalidatePath(`/dashboard/schedule`);
    revalidatePath(`/dashboard/sessions/${sourceSessionId}`);

    if (result.failed.length > 0) {
      return { success: t("bookingsMoved") + " " + t("massMoveReport", { moved: result.moved, failed: result.failed.length }) };
    }
    return { success: t("bookingsMoved") };
  } catch (e) {
    if (e instanceof MassMoveSessionNotFoundError) return { error: t("errors.notFound") };
    if (e instanceof MassMoveTargetCancelledError) return { error: t("errors.generic") };
    if (e instanceof MassMoveTargetPastError) return { error: t("errors.generic") };
    if (e instanceof MassMoveDifferentGroupTypeError) return { error: t("errors.generic") };
    if (e instanceof MassMoveTargetSameAsSourceError) return { error: t("errors.generic") };
    throw e;
  }
}

// ── Faza 18 — Availability-First: pojedyncza sesja bez wzorca ────────────

/**
 * Create a single ad-hoc session for Availability-First group types (F18, §2.1).
 *
 * Availability-First sessions have `generatedFromRecurrenceId = NULL` and
 * trainerId always required. Trainer conflict = Hard Block (no force_override).
 * The availability layer (F17.5) provides a soft warning in the UI only.
 */
export async function createSingleSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("sessions.manage");
  const [t, tv] = await Promise.all([
    getTranslations("schedule"),
    getTranslations("schedule.validation"),
  ]);

  const rawStart = str(formData.get("startTime"));
  const rawEnd = str(formData.get("endTime"));

  const parsed = createSessionSchema(tv).safeParse({
    groupTypeId: str(formData.get("groupTypeId")),
    trainerId: str(formData.get("trainerId")),
    startTime: rawStart ? wallClockToInstant(rawStart, ctx.org.timezone) : undefined,
    endTime: rawEnd ? wallClockToInstant(rawEnd, ctx.org.timezone) : undefined,
    locationId: str(formData.get("locationId")) || null,
    capacity: str(formData.get("capacity")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.createFailed") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const [gt] = await tx
        .select({ engine: groupTypeTable.engine, defaultCapacity: groupTypeTable.defaultCapacity })
        .from(groupTypeTable)
        .where(
          and(
            eq(groupTypeTable.id, parsed.data.groupTypeId),
            eq(groupTypeTable.organizationId, ctx.org.id),
            isNull(groupTypeTable.deletedAt),
          ),
        )
        .limit(1);
      if (!gt) throw new UnknownGroupTypeError();
      if (gt.engine !== "availability_first") throw new WrongEngineError();

      const capacity = parsed.data.capacity ?? gt.defaultCapacity ?? 1;

      const [row] = await tx
        .insert(classSession)
        .values({
          organizationId: ctx.org.id,
          groupTypeId: parsed.data.groupTypeId,
          trainerId: parsed.data.trainerId,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          capacity,
          locationId: parsed.data.locationId ?? null,
        })
        .returning({ id: classSession.id });

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "class_session.create",
        targetType: "class_session",
        targetId: row!.id,
        targetLabel: parsed.data.startTime.toISOString(),
        metadata: {
          groupTypeId: parsed.data.groupTypeId,
          engine: "availability_first",
        },
      });
    });
  } catch (error) {
    if (error instanceof UnknownGroupTypeError) return { error: t("errors.notFound") };
    if (error instanceof WrongEngineError) return { error: t("errors.createFailed") };
    if (sqlStateOf(error) === SQLSTATE_EXCLUSION_VIOLATION) {
      return { error: t("errors.trainerConflict") };
    }
    throw error;
  }

  revalidatePath(`/dashboard/schedule`);
  return { success: t("created") };
}

class UnknownGroupTypeError extends Error {}
class WrongEngineError extends Error {}
