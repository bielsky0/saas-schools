import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { billing } from "@/lib/adapters/billing";
import { jobs, type JobHandler } from "@/lib/adapters/jobs";
import {
  clientPriceOverride,
  clientSubscription,
  creditType,
  organization,
  productTemplate,
} from "@/lib/db/schema";
import { db } from "@/lib/db";
import { withSystemBypass } from "@/lib/db/system";
import { withTenant } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { resolveClientPrice } from "./resolve";

const log = createLogger("pricing");

// ── pricing.sync_subscription_price ──────────────────────────────────────

const syncSchema = z.object({
  organizationId: z.string(),
  clientId: z.string(),
});

export const pricingSyncSubscriptionHandler: JobHandler<"pricing.sync_subscription_price"> = async (
  payload,
) => {
  const { organizationId, clientId } = syncSchema.parse(payload);

  await withTenant(organizationId, async (tx) => {
    const [org] = await tx
      .select({
        stripeConnectAccountId: organization.stripeConnectAccountId,
        currency: organization.currency,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org?.stripeConnectAccountId) {
      log.warn("sync_subscription_price: no Stripe Connect account", { organizationId });
      return;
    }

    const subs = await tx
      .select({
        id: clientSubscription.id,
        productTemplateId: clientSubscription.productTemplateId,
        stripeSubscriptionId: clientSubscription.stripeSubscriptionId,
        stripeSubscriptionItemId: clientSubscription.stripeSubscriptionItemId,
        templatePrice: productTemplate.price,
        templateName: productTemplate.name,
        groupTypeId: creditType.groupTypeId,
      })
      .from(clientSubscription)
      .innerJoin(
        productTemplate,
        and(
          eq(productTemplate.id, clientSubscription.productTemplateId),
          eq(productTemplate.organizationId, organizationId),
        ),
      )
      .innerJoin(
        creditType,
        and(
          eq(creditType.id, productTemplate.creditTypeId),
          eq(creditType.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(clientSubscription.organizationId, organizationId),
          eq(clientSubscription.clientId, clientId),
          eq(clientSubscription.status, "active"),
        ),
      );

    if (subs.length === 0) {
      log.info("sync_subscription_price: no active subscriptions", {
        organizationId,
        clientId,
      });
      return;
    }

    for (const sub of subs) {
      let itemId = sub.stripeSubscriptionItemId;

      if (!itemId) {
        const resolved = await billing.resolveConnectSubscriptionItem({
          subscriptionId: sub.stripeSubscriptionId,
          accountId: org.stripeConnectAccountId,
        });
        if (resolved.ok) {
          itemId = resolved.subscriptionItemId;
          await tx
            .update(clientSubscription)
            .set({ stripeSubscriptionItemId: itemId })
            .where(eq(clientSubscription.id, sub.id));
        } else {
          log.warn(
            "sync_subscription_price: could not resolve subscription item — skipped",
            { subscriptionId: sub.id, clientId },
          );
          continue;
        }
      }

      const resolved = await resolveClientPrice(
        tx,
        clientId,
        sub.groupTypeId!,
        sub.templatePrice,
      );

      await billing.updateConnectSubscriptionItemPrice({
        accountId: org.stripeConnectAccountId,
        subscriptionItemId: itemId,
        amount: resolved,
        currency: org.currency,
        productName: sub.templateName ?? "Pakiet zajęć",
      });

      log.info("sync_subscription_price: synced", {
        subscriptionId: sub.id,
        clientId,
        amount: resolved,
      });
    }
  });
};

// ── pricing.deactivate_expired_overrides ─────────────────────────────────

const BATCH_SIZE = 500;

export const pricingDeactivateExpiredHandler: JobHandler<"pricing.deactivate_expired_overrides"> = async () => {
    const now = sql`now()`;

  const expired = await withSystemBypass(
    "pricing.deactivate_expired_overrides — overrides expire in every academy at once",
    (tx) =>
      tx
        .select({
          id: clientPriceOverride.id,
          organizationId: clientPriceOverride.organizationId,
          clientId: clientPriceOverride.clientId,
        })
        .from(clientPriceOverride)
        .where(
          and(
            eq(clientPriceOverride.isActive, true),
            lt(clientPriceOverride.validUntil, now),
          ),
        )
        .limit(BATCH_SIZE),
  );

  if (expired.length === 0) {
    log.info("deactivate_expired_overrides: nothing due");
    return;
  }

  const byOrganization = new Map<
    string,
    { overrideIds: string[]; clientIds: Set<string> }
  >();
  for (const row of expired) {
    let entry = byOrganization.get(row.organizationId);
    if (!entry) {
      entry = { overrideIds: [], clientIds: new Set() };
      byOrganization.set(row.organizationId, entry);
    }
    entry.overrideIds.push(row.id);
    entry.clientIds.add(row.clientId);
  }

  let deactivated = 0;
  for (const [organizationId, entry] of byOrganization) {
    const updated = await withTenant(organizationId, (tx) =>
      tx
        .update(clientPriceOverride)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(clientPriceOverride.organizationId, organizationId),
            inArray(clientPriceOverride.id, entry.overrideIds),
            eq(clientPriceOverride.isActive, true),
            lt(clientPriceOverride.validUntil, sql`now()`),
          ),
        )
        .returning({ id: clientPriceOverride.id }),
    );
    deactivated += updated.length;

    for (const clientId of entry.clientIds) {
      await jobs.enqueue(db, "pricing.sync_subscription_price", {
        organizationId,
        clientId,
      });
    }
  }

  log.info("deactivate_expired_overrides: done", {
    deactivated,
    scanned: expired.length,
    organizations: byOrganization.size,
    saturated: expired.length === BATCH_SIZE,
  });
};
