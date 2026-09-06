"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withSystemBypass } from "@/lib/db/system";
import { adminFeatureFlag, adminFeatureFlagValue } from "@/lib/db/schema";
import { invalid, type FormState } from "@/lib/validation";
import { recordAudit } from "./audit";
import { requireSuperAdmin } from "./context";
import {
  flagCreateSchema,
  flagGlobalSetSchema,
  flagTargetSchema,
  flagValueSetSchema,
  type FlagCreateInput,
  type FlagValueState,
} from "./schema";

/**
 * Feature-flag server actions (apex-dashboard-plan Faza 3.1).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every write
 * here targets a GLOBAL table — `admin_feature_flag` / `admin_feature_flag_value`
 * whose only RLS policy is the system bypass (migration 0086). A tenant session
 * must never mutate another org's overrides. The module is enumerated in
 * eslint.config.mjs next to `groups-actions.ts` for the same reason.
 *
 * INVARIANT (same as groups-actions.ts / plans-data.ts):
 *   1. `requireSuperAdmin()` as the FIRST line
 *   2. Write in `withSystemBypass` (GLOBAL tables)
 *   3. `recordAudit(tx, ...)` inside the SAME transaction (Rule A)
 *   4. `revalidatePath` after commit
 *
 * Unlike the group forms, the matrix cells take ARGUMENTS, not FormData: a cell
 * count (~flags × ~groups) is dynamic, so a `<form>` per cell with useActionState
 * would need one hook per cell and cannot. The client calls these through
 * `useTransition` instead — same actions, no hook-per-dynamic-cell problem.
 *
 * NOTE on the slug/flag uniqueness probes: these tables are fail-closed under
 * RLS — a plain `db` read sees NO rows even when a key IS taken (migration 0086
 * leaves no permissive SELECT). Every existence probe therefore runs inside
 * `withSystemBypass`, exactly like `resolveUniqueSlug` does for client groups.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NOT_FOUND = Object.assign(new Error("flag not found"), { code: "NOT_FOUND" });
const CONFLICT = Object.assign(new Error("flag key already exists"), { code: "CONFLICT" });

function flagNotFound(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "NOT_FOUND";
}
function isConflict(err: unknown): boolean {
  return (
    (err instanceof Error && "code" in err && (err as { code?: string }).code === "CONFLICT") ||
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505")
  );
}

// ── Override cells (group / organization) — tri-state On|Off|Inherit ──────

export async function setFlagValueAction(input: {
  featureKey: string;
  scope: "group" | "organization";
  scopeId: string;
  value: FlagValueState;
}): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const parsed = flagValueSetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, GENERIC_ERROR);
  const { featureKey, scope, scopeId, value } = parsed.data;

  try {
    await withSystemBypass("super admin: set feature flag override", async (tx) => {
      const [flag] = await tx
        .select({
          id: adminFeatureFlag.id,
          key: adminFeatureFlag.key,
          label: adminFeatureFlag.label,
        })
        .from(adminFeatureFlag)
        .where(eq(adminFeatureFlag.key, featureKey))
        .limit(1);
      if (!flag) throw NOT_FOUND;

      const [existing] = await tx
        .select({ id: adminFeatureFlagValue.id, enabled: adminFeatureFlagValue.enabled })
        .from(adminFeatureFlagValue)
        .where(
          and(
            eq(adminFeatureFlagValue.featureKey, featureKey),
            eq(adminFeatureFlagValue.scope, scope),
            eq(adminFeatureFlagValue.scopeId, scopeId),
          ),
        )
        .limit(1);

      const from = existing?.enabled ?? null;
      // `undefined` when the cell is reset to inherit — no row stores that state.
      const targetEnabled = value === "inherit" ? undefined : value === "on";

      if (existing && targetEnabled === undefined) {
        await tx.delete(adminFeatureFlagValue).where(eq(adminFeatureFlagValue.id, existing.id));
      } else if (existing) {
        await tx
          .update(adminFeatureFlagValue)
          .set({ enabled: targetEnabled })
          .where(eq(adminFeatureFlagValue.id, existing.id));
      } else if (targetEnabled !== undefined) {
        await tx.insert(adminFeatureFlagValue).values({
          id: crypto.randomUUID(),
          featureKey,
          scope,
          scopeId,
          enabled: targetEnabled,
        });
      } else {
        return;
      }

      await recordAudit(tx, {
        action: "feature_flag_value.set",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: scope === "organization" ? scopeId : null,
        targetType: "feature_flag",
        targetId: flag.key,
        targetLabel: `${flag.label} (${scope}:${scopeId})`,
        metadata: { featureKey, scope, scopeId, from, to: targetEnabled ?? null },
      });
    });

    revalidatePath("/admin/feature-flags");
    return { success: "Feature flag updated." };
  } catch (err) {
    if (flagNotFound(err)) return { error: "Flag not found." };
    return { error: GENERIC_ERROR };
  }
}

// ── Global column — flips the dictionary row's base layer ──────────────────

export async function setGlobalFlagAction(input: {
  featureKey: string;
  enabled: boolean;
}): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const parsed = flagGlobalSetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, GENERIC_ERROR);
  const { featureKey, enabled } = parsed.data;

  try {
    await withSystemBypass("super admin: set global feature flag", async (tx) => {
      const [flag] = await tx
        .select({
          id: adminFeatureFlag.id,
          key: adminFeatureFlag.key,
          label: adminFeatureFlag.label,
          enabledGlobal: adminFeatureFlag.enabledGlobal,
        })
        .from(adminFeatureFlag)
        .where(eq(adminFeatureFlag.key, featureKey))
        .limit(1);
      if (!flag) throw NOT_FOUND;

      if (flag.enabledGlobal === enabled) return; // no change — nothing to audit

      await tx
        .update(adminFeatureFlag)
        .set({ enabledGlobal: enabled })
        .where(eq(adminFeatureFlag.key, featureKey));

      await recordAudit(tx, {
        action: "feature_flag.update",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "feature_flag",
        targetId: flag.key,
        targetLabel: flag.label,
        metadata: {
          changes: { enabledGlobal: { from: flag.enabledGlobal, to: enabled } },
        },
      });
    });

    revalidatePath("/admin/feature-flags");
    return { success: "Feature flag updated." };
  } catch (err) {
    if (flagNotFound(err)) return { error: "Flag not found." };
    return { error: GENERIC_ERROR };
  }
}

// ── Dictionary CRUD ────────────────────────────────────────────────────────

export async function createFeatureFlagAction(input: FlagCreateInput): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const parsed = flagCreateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, GENERIC_ERROR);
  const { key, label, description, enabledGlobal, condition } = parsed.data;

  try {
    await withSystemBypass("super admin: create feature flag", async (tx) => {
      const [existing] = await tx
        .select({ id: adminFeatureFlag.id })
        .from(adminFeatureFlag)
        .where(eq(adminFeatureFlag.key, key))
        .limit(1);
      if (existing) throw CONFLICT;

      const [row] = await tx
        .insert(adminFeatureFlag)
        .values({
          id: crypto.randomUUID(),
          key,
          label,
          description: description || null,
          enabledGlobal,
          condition: condition ?? null,
        })
        .returning({ id: adminFeatureFlag.id, key: adminFeatureFlag.key });

      if (!row) throw new Error("no row returned");

      await recordAudit(tx, {
        action: "feature_flag.create",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "feature_flag",
        targetId: row.key,
        targetLabel: label,
        metadata: { key, label, description, enabledGlobal, condition },
      });
    });

    revalidatePath("/admin/feature-flags");
    return { success: `Flag "${label}" created.` };
  } catch (err) {
    if (isConflict(err)) return { error: `Flag key "${key}" already exists.` };
    return { error: GENERIC_ERROR };
  }
}

export async function deleteFeatureFlagAction(input: { featureKey: string }): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const parsed = flagTargetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, GENERIC_ERROR);
  const { featureKey } = parsed.data;

  try {
    await withSystemBypass("super admin: delete feature flag", async (tx) => {
      const [flag] = await tx
        .select({
          id: adminFeatureFlag.id,
          key: adminFeatureFlag.key,
          label: adminFeatureFlag.label,
          enabledGlobal: adminFeatureFlag.enabledGlobal,
        })
        .from(adminFeatureFlag)
        .where(eq(adminFeatureFlag.key, featureKey))
        .limit(1);
      if (!flag) throw NOT_FOUND;

      // `admin_feature_flag_value.feature_key` cascades on delete (schema FK),
      // so removing every override is a side effect of this one delete.
      await tx.delete(adminFeatureFlag).where(eq(adminFeatureFlag.key, featureKey));

      await recordAudit(tx, {
        action: "feature_flag.delete",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "feature_flag",
        targetId: flag.key,
        targetLabel: flag.label,
        metadata: { key: flag.key, label: flag.label, enabledGlobal: flag.enabledGlobal },
      });
    });

    revalidatePath("/admin/feature-flags");
    return { success: "Feature flag deleted." };
  } catch (err) {
    if (flagNotFound(err)) return { error: "Flag not found." };
    return { error: GENERIC_ERROR };
  }
}