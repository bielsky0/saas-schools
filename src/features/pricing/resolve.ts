import { and, eq, isNull, lte, gte, or, sql } from "drizzle-orm";

import { clientPriceOverride } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * Resolve the effective price for a client booking a specific group type
 * (Constraint 9, §1.3). This is the SINGLE price-resolution point for both
 * `booking.price_snapshot` and `credit_purchase.price_paid`.
 *
 * Resolution order:
 *   1. client_price_override WHERE (client_id, group_type_id)
 *      AND is_active = true AND valid_from <= now()
 *      AND (valid_until IS NULL OR valid_until >= now())
 *   2. client_price_override WHERE (client_id, group_type_id IS NULL)
 *      AND is_active = true AND valid_from <= now()
 *      AND (valid_until IS NULL OR valid_until >= now())
 *   3. No match → return `basePrice` (catalog price) unchanged
 *
 * Returns the final price in minor units. For percent_discount uses
 * Math.round (real money, matching Stripe's unit_amount rounding).
 * Differs from FLOOR in F20 (informational wages vs real money).
 *
 * Must be called inside a withTenant() transaction.
 *
 * @param tx  Active tenant transaction
 * @param clientId  The client (parent) id
 * @param groupTypeId  The group type id (the specific offer)
 * @param basePrice  The catalog price from group_type or product_template
 */
export async function resolveClientPrice(
  tx: TenantDb,
  clientId: string,
  groupTypeId: string,
  basePrice: number,
): Promise<number> {
  const now = sql`now()::date`;

  // Step 1: exact group_type match
  const exact = await tx
    .select()
    .from(clientPriceOverride)
    .where(
      and(
        eq(clientPriceOverride.clientId, clientId),
        eq(clientPriceOverride.groupTypeId, groupTypeId),
        eq(clientPriceOverride.isActive, true),
        lte(clientPriceOverride.validFrom, now),
        or(isNull(clientPriceOverride.validUntil), gte(clientPriceOverride.validUntil, now)),
      ),
    )
    .limit(1);

  if (exact.length > 0) {
    return applyOverride(basePrice, exact[0]!.overrideType, exact[0]!.value);
  }

  // Step 2: academy-wide override (NULL group_type_id)
  const orgWide = await tx
    .select()
    .from(clientPriceOverride)
    .where(
      and(
        eq(clientPriceOverride.clientId, clientId),
        isNull(clientPriceOverride.groupTypeId),
        eq(clientPriceOverride.isActive, true),
        lte(clientPriceOverride.validFrom, now),
        or(isNull(clientPriceOverride.validUntil), gte(clientPriceOverride.validUntil, now)),
      ),
    )
    .limit(1);

  if (orgWide.length > 0) {
    return applyOverride(basePrice, orgWide[0]!.overrideType, orgWide[0]!.value);
  }

  // Step 3: no override → catalog price
  return basePrice;
}

/**
 * Check if a client has ANY active override for the given group type (or
 * academy-wide). Useful for the UI to decide whether to show a discount
 * badge, and for the checkout flow to decide whether to use price_data.
 *
 * Returns the override row if found, null otherwise.
 */
export async function findActiveOverride(
  tx: TenantDb,
  clientId: string,
  groupTypeId: string,
): Promise<{ overrideType: "percent_discount" | "fixed_price"; value: number } | null> {
  const resolved = await tx
    .select({ overrideType: clientPriceOverride.overrideType, value: clientPriceOverride.value })
    .from(clientPriceOverride)
    .where(
      and(
        eq(clientPriceOverride.clientId, clientId),
        or(
          eq(clientPriceOverride.groupTypeId, groupTypeId),
          isNull(clientPriceOverride.groupTypeId),
        ),
        eq(clientPriceOverride.isActive, true),
        lte(clientPriceOverride.validFrom, sql`now()::date`),
        or(isNull(clientPriceOverride.validUntil), gte(clientPriceOverride.validUntil, sql`now()::date`)),
      ),
    )
    .orderBy(clientPriceOverride.groupTypeId)
    .limit(1);

  return resolved[0] ?? null;
}

function applyOverride(
  basePrice: number,
  overrideType: "percent_discount" | "fixed_price",
  value: number,
): number {
  if (overrideType === "fixed_price") {
    return value;
  }
  return Math.round(basePrice * (1 - value / 100));
}
