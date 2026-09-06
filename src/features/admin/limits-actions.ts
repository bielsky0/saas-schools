"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withSystemBypass } from "@/lib/db/system";
import { adminClientGroupLimitValue } from "@/lib/db/schema";
import { LIMIT_KEYS, type LimitKey } from "@/features/billing/limits";
import type { FormState } from "@/lib/validation";
import { recordAudit } from "./audit";
import { requireSuperAdmin } from "./context";

/**
 * Group limit override server actions (apex-dashboard-plan Faza 5, §5.1).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every write
 * here targets the GLOBAL table `admin_client_group_limit_value` whose only
 * RLS policy is the system bypass (migration 0091). The module is enumerated
 * in eslint.config.mjs next to `groups-actions.ts` for the same reason.
 *
 * INVARIANT (same as groups-actions.ts / flags-actions.ts / plans-data.ts):
 *   1. `requireSuperAdmin()` as the FIRST line
 *   2. Write in `withSystemBypass` (GLOBAL table, no tenant GUC)
 *   3. `recordAudit(tx, ...)` inside the SAME transaction (Rule A)
 *   4. `revalidatePath` after commit
 *
 * Like the flag matrix cells, these actions take ARGUMENTS, not FormData, so
 * the dynamic cell grid on /admin/limits can call them through useTransition.
 *
 * A NULL `limitValue` is an EXPLICIT override to "unlimited" (it wins over any
 * number in the group and blocks the plan's unlimited — see
 * billing/limits-resolution.ts). Deleting the row = "inherit", never "unlimited".
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";

function isLimitKey(value: string): value is LimitKey {
  return (LIMIT_KEYS as readonly string[]).includes(value);
}

/** Set or change a group override. `limitValue: null` → explicit unlimited. */
export async function upsertGroupLimitAction(input: {
  groupId: string;
  limitKey: string;
  limitValue: number | null;
}): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const { groupId, limitKey } = input;

  if (!groupId) return { error: "Group is required." };
  if (!isLimitKey(limitKey)) return { error: "Invalid limit key." };

  const limitValue = input.limitValue;
  if (limitValue !== null && (!Number.isInteger(limitValue) || limitValue < 0)) {
    return { error: "Limit must be a non-negative whole number, or empty for unlimited." };
  }

  try {
    await withSystemBypass("super admin: upsert group limit", async (tx) => {
      const [existing] = await tx
        .select({ limitValue: adminClientGroupLimitValue.limitValue })
        .from(adminClientGroupLimitValue)
        .where(
          and(
            eq(adminClientGroupLimitValue.groupId, groupId),
            eq(adminClientGroupLimitValue.limitKey, limitKey),
          ),
        )
        .limit(1);

      if (existing && existing.limitValue === limitValue) return; // no change

      if (existing) {
        await tx
          .update(adminClientGroupLimitValue)
          .set({ limitValue })
          .where(
            and(
              eq(adminClientGroupLimitValue.groupId, groupId),
              eq(adminClientGroupLimitValue.limitKey, limitKey),
            ),
          );
      } else {
        await tx.insert(adminClientGroupLimitValue).values({
          id: crypto.randomUUID(),
          groupId,
          limitKey,
          limitValue,
        });
      }

      await recordAudit(tx, {
        action: "client_group_limit.set",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "client_group",
        targetId: groupId,
        targetLabel: limitKey,
        metadata: {
          groupId,
          limitKey,
          from: existing?.limitValue ?? null,
          to: limitValue,
        },
      });
    });

    revalidatePath("/admin/limits");
    return { success: `Limit "${limitKey}" updated.` };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

/** Delete a group override entirely (back to inherit). */
export async function deleteGroupLimitAction(input: {
  groupId: string;
  limitKey: string;
}): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const { groupId, limitKey } = input;

  if (!groupId || !isLimitKey(limitKey)) return { error: "Invalid input." };

  try {
    await withSystemBypass("super admin: delete group limit", async (tx) => {
      const [existing] = await tx
        .select({ limitValue: adminClientGroupLimitValue.limitValue })
        .from(adminClientGroupLimitValue)
        .where(
          and(
            eq(adminClientGroupLimitValue.groupId, groupId),
            eq(adminClientGroupLimitValue.limitKey, limitKey),
          ),
        )
        .limit(1);
      if (!existing) return; // nothing to delete — idempotent

      await tx
        .delete(adminClientGroupLimitValue)
        .where(
          and(
            eq(adminClientGroupLimitValue.groupId, groupId),
            eq(adminClientGroupLimitValue.limitKey, limitKey),
          ),
        );

      await recordAudit(tx, {
        action: "client_group_limit.reset",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "client_group",
        targetId: groupId,
        targetLabel: limitKey,
        metadata: { groupId, limitKey, from: existing.limitValue, to: null },
      });
    });

    revalidatePath("/admin/limits");
    return { success: `Limit "${limitKey}" reset to plan default.` };
  } catch {
    return { error: GENERIC_ERROR };
  }
}