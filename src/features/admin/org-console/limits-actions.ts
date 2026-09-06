"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/validation";
import {
  deleteOrgOverrideAction as plansDeleteOrgOverride,
  upsertOrgOverrideAction as plansUpsertOrgOverride,
} from "@/features/admin/plans-data";
import { requireSuperAdmin } from "@/features/admin/context";

/**
 * Org-console limits actions (apex-dashboard-plan 4.2 limits — Diff view).
 *
 * Thin console wrappers over the shared plans-data override actions: same core
 * logic, same audit, same tables — but the revalidation target is the console's
 * limits tab (the shared actions refresh /admin/plans). `requireSuperAdmin` is
 * already the first line inside the shared actions; re-checked here too because
 * the two revalidations differ, and this wrapper must not be the thing that
 * skips a guard if the shared core ever changes.
 */

function consolePath(orgId: string): string {
  return `/admin/orgs/${orgId}/console/limits`;
}

function orgIdOf(formData: FormData): string {
  const raw = formData.get("organizationId");
  return typeof raw === "string" ? raw : "";
}

export async function upsertOrgOverrideAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const result = await plansUpsertOrgOverride(_prev, formData);
  revalidatePath(consolePath(orgIdOf(formData)));
  return result;
}

export async function deleteOrgOverrideAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const result = await plansDeleteOrgOverride(_prev, formData);
  revalidatePath(consolePath(orgIdOf(formData)));
  return result;
}