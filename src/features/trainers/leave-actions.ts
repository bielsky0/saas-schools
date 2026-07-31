"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { resolveActor } from "@/features/admin/audit";
import { requireOrgAccess, requireOrgPermission } from "@/features/organizations/context";
import { leaveRequest } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";

import { substituteTrainerForDateRange } from "@/features/schedule/substitute-trainer";
import {
  approveLeaveSchema,
  LeaveRequestNotFoundError,
  OverlappingLeaveError,
  rejectLeaveSchema,
  submitLeaveSchema,
  SubstituteSameAsTrainerError,
  WrongStatusError,
} from "./leave-schema";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function submitLeaveRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = submitLeaveSchema.safeParse({
    startDate: str(formData.get("startDate")),
    endDate: str(formData.get("endDate")),
    reason: str(formData.get("reason")) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues.map((e) => e.message).join(", ") };

  const { startDate, endDate, reason } = parsed.data;
  const ctx = await requireOrgAccess();
  const t = await getTranslations("staffPanel");

  if (ctx.membership.role !== "trainer") {
    return { error: "Only trainers can submit leave requests" };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const existing = await tx
        .select({ id: leaveRequest.id })
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.trainerId, ctx.membership.userId),
            eq(leaveRequest.organizationId, ctx.org.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) throw new OverlappingLeaveError();

      const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const insertData: typeof leaveRequest.$inferInsert = {
        organizationId: ctx.org.id,
        trainerId: ctx.membership.userId,
        startDate: toDateStr(startDate),
        endDate: toDateStr(endDate),
        reason: reason ?? null,
        status: "submitted",
      };
      await tx.insert(leaveRequest).values(insertData);
    });

    revalidatePath("/dashboard/leave-requests");
    return { success: t("leaveRequestSubmitted" as Parameters<typeof t>[0], { defaultValue: "Leave request submitted." }) };
  } catch (e) {
    if (e instanceof OverlappingLeaveError) {
      return { error: t("errors.overlappingLeave" as Parameters<typeof t>[0], { defaultValue: "You already have a leave request in this date range." }) };
    }
    throw e;
  }
}

export async function approveLeaveRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = approveLeaveSchema.safeParse({
    requestId: str(formData.get("requestId")),
    substituteTrainerId: str(formData.get("substituteTrainerId")) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues.map((e) => e.message).join(", ") };

  const { requestId, substituteTrainerId } = parsed.data;
  const ctx = await requireOrgPermission("sessions.manage");
  const t = await getTranslations("staffPanel");
  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const row = await tx
        .select()
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.id, requestId),
            eq(leaveRequest.organizationId, ctx.org.id),
          ),
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!row) throw new LeaveRequestNotFoundError();
      if (row.status !== "submitted") throw new WrongStatusError("submitted");
      if (substituteTrainerId && substituteTrainerId === row.trainerId) {
        throw new SubstituteSameAsTrainerError();
      }

      if (substituteTrainerId) {
        await substituteTrainerForDateRange(tx, {
          organizationId: ctx.org.id,
          trainerId: row.trainerId,
          substituteTrainerId,
          startDate: row.startDate,
          endDate: row.endDate,
          actor,
        });
      }

      await tx
        .update(leaveRequest)
        .set({
          status: "approved",
          substituteTrainerId: substituteTrainerId ?? null,
          reviewedByUserId: actor.actorId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leaveRequest.id, requestId));
    });

    revalidatePath("/dashboard/leave-requests");
    return { success: t("leaveRequestApproved" as Parameters<typeof t>[0], { defaultValue: "Leave request approved." }) };
  } catch (e) {
    if (e instanceof LeaveRequestNotFoundError) return { error: t("errors.generic") };
    if (e instanceof WrongStatusError) return { error: t("errors.leaveRequestNotPending" as Parameters<typeof t>[0], { defaultValue: "Leave request is not pending." }) };
    if (e instanceof SubstituteSameAsTrainerError) return { error: "Substitute cannot be the same as the trainer on leave." };
    throw e;
  }
}

export async function rejectLeaveRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = rejectLeaveSchema.safeParse({
    requestId: str(formData.get("requestId")),
    reason: str(formData.get("reason")),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((e) => e.message).join(", ") };

  const { requestId, reason } = parsed.data;
  const ctx = await requireOrgPermission("sessions.manage");
  const t = await getTranslations("staffPanel");
  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const row = await tx
        .select()
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.id, requestId),
            eq(leaveRequest.organizationId, ctx.org.id),
          ),
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!row) throw new LeaveRequestNotFoundError();
      if (row.status !== "submitted") throw new WrongStatusError("submitted");

      await tx
        .update(leaveRequest)
        .set({
          status: "rejected",
          rejectionReason: reason,
          reviewedByUserId: actor.actorId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leaveRequest.id, requestId));
    });

    revalidatePath("/dashboard/leave-requests");
    return { success: t("leaveRequestRejected" as Parameters<typeof t>[0], { defaultValue: "Leave request rejected." }) };
  } catch (e) {
    if (e instanceof LeaveRequestNotFoundError) return { error: t("errors.generic") };
    if (e instanceof WrongStatusError) return { error: t("errors.leaveRequestNotPending" as Parameters<typeof t>[0], { defaultValue: "Leave request is not pending." }) };
    throw e;
  }
}

export async function cancelLeaveRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = str(formData.get("requestId"));
  if (!requestId) return { error: "Missing requestId" };

  const ctx = await requireOrgAccess();
  const t = await getTranslations("staffPanel");

  const isAdmin = ctx.effectivePermissions.has("sessions.manage");
  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const row = await tx
        .select()
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.id, requestId),
            eq(leaveRequest.organizationId, ctx.org.id),
          ),
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!row) throw new LeaveRequestNotFoundError();
      if (row.status !== "submitted" && row.status !== "approved") {
        throw new WrongStatusError("submitted or approved");
      }
      if (!isAdmin && row.trainerId !== ctx.membership.userId) {
        return { error: t("errors.unauthorized" as Parameters<typeof t>[0], { defaultValue: "Unauthorized." }) };
      }

      await tx
        .update(leaveRequest)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(leaveRequest.id, requestId));
    });

    revalidatePath("/dashboard/leave-requests");
    return { success: t("leaveRequestCancelled" as Parameters<typeof t>[0], { defaultValue: "Leave request cancelled." }) };
  } catch (e) {
    if (e instanceof LeaveRequestNotFoundError) return { error: t("errors.generic") };
    if (e instanceof WrongStatusError) return { error: t("errors.leaveRequestNotCancellable" as Parameters<typeof t>[0], { defaultValue: "Leave request cannot be cancelled in its current state." }) };
    throw e;
  }
}
