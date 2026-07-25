"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { resolveClientSession } from "@/features/client-auth/session";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { assertConnectActive } from "@/features/billing/checkout";
import { startConnectSubscriptionCheckout } from "@/features/billing/connect-checkout";
import { findActiveOverride, resolveClientPrice } from "@/features/pricing/resolve";
import { withTenant } from "@/lib/db/tenant";
import { client, creditType, groupType, productTemplate } from "@/lib/db/schema";
import type { FormState } from "@/lib/validation";

/**
 * Client-facing subscription checkout (F12d, EPIK 9).
 *
 * Initiated by an authenticated parent on the academy's public site.
 * Creates a Stripe Checkout Session in subscription mode on the academy's
 * Connect account; the webhook (`processSubscriptionInitial`) creates
 * `client_subscription` when the checkout completes.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function checkoutSubscriptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const org = await requireServedOrganization();
  const principal = await resolveClientSession(org.id);

  if (!principal?.isVerified) {
    return { error: "Verify your email address first" };
  }

  await assertConnectActive(org.id);

  if (!org.stripeConnectAccountId) {
    return { error: "Online payments are not available yet" };
  }

  const templateId = str(formData.get("productTemplateId"));

  const results = await withTenant(org.id, async (tx) => {
    const [tmpl] = await tx
      .select({
        id: productTemplate.id,
        creditTypeId: productTemplate.creditTypeId,
        creditQuantity: productTemplate.creditQuantity,
        price: productTemplate.price,
        isActive: productTemplate.isActive,
        billingType: productTemplate.billingType,
        stripePriceId: productTemplate.stripePriceId,
        interval: productTemplate.interval,
        intervalCount: productTemplate.intervalCount,
      })
      .from(productTemplate)
      .where(
        and(
          eq(productTemplate.id, templateId),
          eq(productTemplate.organizationId, org.id),
        ),
      )
      .limit(1);

    const [parent] = await tx
      .select({ email: client.email, name: client.name })
      .from(client)
      .where(eq(client.id, principal.clientId))
      .limit(1);

    // US-23.6 AC2/AC3: sprawdź politykę grupy (F12e).
    let policy: { allowedPurchaseModes: readonly string[]; allowedBillingTypes: readonly string[] | null } | null = null;
    let resolvedGroupTypeId: string | null = null;
    if (tmpl) {
      const [p] = await tx
        .select({
          allowedPurchaseModes: groupType.allowedPurchaseModes,
          allowedBillingTypes: groupType.allowedBillingTypes,
          groupTypeId: groupType.id,
        })
        .from(groupType)
        .innerJoin(creditType, eq(creditType.groupTypeId, groupType.id))
        .where(
          and(
            eq(creditType.id, tmpl.creditTypeId),
            eq(creditType.organizationId, org.id),
            isNull(creditType.deletedAt),
          ),
        )
        .limit(1);
      policy = p ?? null;
      if (p) resolvedGroupTypeId = p.groupTypeId;
    }

    const override = resolvedGroupTypeId
      ? await findActiveOverride(tx, principal.clientId, resolvedGroupTypeId)
      : null;
    const resolvedPrice = override
      ? await resolveClientPrice(tx, principal.clientId, resolvedGroupTypeId!, tmpl!.price)
      : tmpl?.price ?? 0;
    const usePriceData = override !== null;

    return { tmpl: tmpl ?? null, parent: parent ?? null, policy, resolvedPrice, usePriceData } as const;
  });

  const { tmpl, parent, policy, resolvedPrice, usePriceData } = results;

  if (!tmpl) {
    return { error: "Package not found" };
  }
  if (!tmpl.isActive) {
    return { error: "This package is no longer available" };
  }
  if (tmpl.billingType !== "recurring") {
    return { error: "This package is not a subscription" };
  }
  if (!tmpl.interval) {
    return { error: "Subscription interval is not configured" };
  }

  // US-23.6 AC2/AC3: sprawdź politykę grupy (F12e).
  if (policy && !policy.allowedPurchaseModes.includes("package")) {
    return { error: "Package purchases are no longer available for this group type" };
  }
  if (policy?.allowedBillingTypes && !policy.allowedBillingTypes.includes("recurring")) {
    return { error: "Subscriptions are no longer available for this group type" };
  }

  const checkout = await startConnectSubscriptionCheckout(
    org.id,
    org.subdomain,
    principal.clientId,
    parent?.email ?? "",
    parent?.name ?? "",
    tmpl.creditTypeId,
    tmpl.id,
    tmpl.creditQuantity,
    usePriceData ? resolvedPrice : tmpl.price,
    org.currency,
    org.stripeConnectAccountId,
    usePriceData ? null : (tmpl.stripePriceId ?? null),
    tmpl.interval,
    tmpl.intervalCount ?? 1,
  );

  if (checkout.ok) {
    redirect(checkout.url);
  }

  return { error: "Could not create checkout session. Please try again." };
}
