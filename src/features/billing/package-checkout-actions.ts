"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { resolveClientSession } from "@/features/client-auth/session";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { assertConnectActive } from "@/features/billing/checkout";
import { startConnectPackageCheckout } from "@/features/billing/connect-checkout";
import { withTenant } from "@/lib/db/tenant";
import { creditType, groupType, productTemplate } from "@/lib/db/schema";
import type { FormState } from "@/lib/validation";

/**
 * Client-facing package checkout (F12c, EPIK 9).
 *
 * Initiated by an authenticated parent on the academy's public site.
 * Creates a Stripe Checkout Session on the academy's Connect account;
 * the webhook handler processes the payment outcome.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function checkoutPackageAction(
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

  const result = await withTenant(org.id, async (tx) => {
    const [row] = await tx
      .select({
        id: productTemplate.id,
        creditTypeId: productTemplate.creditTypeId,
        creditQuantity: productTemplate.creditQuantity,
        price: productTemplate.price,
        isActive: productTemplate.isActive,
        billingType: productTemplate.billingType,
        stripePriceId: productTemplate.stripePriceId,
      })
      .from(productTemplate)
      .where(
        and(
          eq(productTemplate.id, templateId),
          eq(productTemplate.organizationId, org.id),
        ),
      )
      .limit(1);

    // US-23.6 AC2/AC3: sprawdź politykę grupy (F12e).
    let policy: { allowedPurchaseModes: readonly string[]; allowedBillingTypes: readonly string[] | null } | null = null;
    if (row) {
      const [p] = await tx
        .select({
          allowedPurchaseModes: groupType.allowedPurchaseModes,
          allowedBillingTypes: groupType.allowedBillingTypes,
        })
        .from(groupType)
        .innerJoin(creditType, eq(creditType.groupTypeId, groupType.id))
        .where(
          and(
            eq(creditType.id, row.creditTypeId),
            eq(creditType.organizationId, org.id),
            isNull(creditType.deletedAt),
          ),
        )
        .limit(1);
      policy = p ?? null;
    }

    return { tmpl: row ?? null, policy } as const;
  });

  const { tmpl, policy } = result;

  if (!tmpl) {
    return { error: "Package not found" };
  }
  if (!tmpl.isActive) {
    return { error: "This package is no longer available" };
  }

  // US-23.6 AC2/AC3: sprawdź politykę grupy (F12e).
  if (policy && !policy.allowedPurchaseModes.includes("package")) {
    return { error: "Package purchases are no longer available for this group type" };
  }
  if (policy?.allowedBillingTypes && !policy.allowedBillingTypes.includes("one_time")) {
    return { error: "One-time packages are no longer available for this group type" };
  }

  const checkout = await startConnectPackageCheckout(
    org.id,
    org.subdomain,
    principal.clientId,
    tmpl.creditTypeId,
    tmpl.id,
    tmpl.creditQuantity,
    tmpl.price,
    org.currency,
    org.stripeConnectAccountId,
    tmpl.stripePriceId ?? null,
  );

  if (checkout.ok) {
    redirect(checkout.url);
  }

  return { error: "Could not create checkout session. Please try again." };
}
