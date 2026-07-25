"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { createRate, deleteRate } from "./rate-data";
import { generateEarningsReport } from "./earnings-data";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function num(value: FormDataEntryValue | null): number | null {
  if (typeof value === "string" && value.length > 0) {
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// ── CRUD: Create ────────────────────────────────────────────────────────────

export async function createRateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("trainer_rates.manage");
  const t = await getTranslations("staffPanel");

  const trainerId = str(formData.get("trainerId"));
  const amount = num(formData.get("amount"));
  const effectiveFrom = str(formData.get("effectiveFrom"));
  const groupTypeId = str(formData.get("groupTypeId")) || undefined;
  const rateType = str(formData.get("rateType")) || "flat_per_session";

  if (!trainerId || amount === null || !effectiveFrom) {
    return { error: t("errors.generic") };
  }

  const parsedDate = new Date(effectiveFrom);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  await withTenant(ctx.org.id, async (tx) => {
    const rate = await createRate(tx, {
      organizationId: ctx.org.id,
      trainerId,
      amount,
      effectiveFrom: parsedDate,
      groupTypeId: groupTypeId || null,
      rateType: rateType as "flat_per_session" | "hourly",
    });
    await recordAudit(tx, {
      organizationId: ctx.org.id,
      actor,
      action: "trainer_rate.created",
      targetId: rate.id,
      targetType: "trainer_rate",
      targetLabel: `Rate ${amount} for trainer ${trainerId}`,
    });
  });

  revalidatePath("/dashboard/trainers/rates");
  return { success: t("rateCreated" as Parameters<typeof t>[0], { defaultValue: "Rate created." }) };
}

// ── CRUD: Delete ────────────────────────────────────────────────────────────

export async function deleteRateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("trainer_rates.manage");
  const t = await getTranslations("staffPanel");

  const id = str(formData.get("id"));
  if (!id) return { error: t("errors.generic") };

  const actor = await resolveActor(ctx.session);

  await withTenant(ctx.org.id, async (tx) => {
    await recordAudit(tx, {
      organizationId: ctx.org.id,
      actor,
      action: "trainer_rate.deleted",
      targetId: id,
      targetType: "trainer_rate",
      targetLabel: "Rate deleted",
    });
    await deleteRate(tx, ctx.org.id, id);
  });

  revalidatePath("/dashboard/trainers/rates");
  return { success: t("rateDeleted" as Parameters<typeof t>[0], { defaultValue: "Rate deleted." }) };
}

// ── Earnings report ─────────────────────────────────────────────────────────

export type EarningsReportData = Awaited<ReturnType<typeof generateEarningsReport>>;

/**
 * Generate the earnings report for a date range.
 *
 * - Owner/Admin: may specify trainerId to filter; null = all trainers.
 * - Trainer: trainerId is FORCED to caller.userId regardless of input.
 */
export async function getEarningsReportAction(formData: FormData): Promise<EarningsReportData> {
  const ctx = await requireOrgPermission("trainer_earnings.view");

  const dateFromStr = str(formData.get("dateFrom") ?? "1970-01-01");
  const dateToStr = str(formData.get("dateTo") ?? "2099-12-31");
  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);

  const effectiveRole = ctx.membership?.role;
  const isTrainer = effectiveRole === "trainer";

  return withTenant(ctx.org.id, (tx) =>
    generateEarningsReport(
      tx,
      {
        organizationId: ctx.org.id,
        trainerId: isTrainer ? ctx.session.user.id : (str(formData.get("trainerId")) || undefined),
        dateFrom,
        dateTo,
      },
      isTrainer ? { callerUserId: ctx.session.user.id } : undefined,
    ),
  );
}
