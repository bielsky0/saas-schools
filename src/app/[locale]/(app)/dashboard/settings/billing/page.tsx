import type { ConnectAccountStatus } from "@/lib/adapters/billing";
import { getTranslations } from "next-intl/server";

import { BillingPanel } from "@/features/billing/components/billing-panel";
import { ConnectPanel } from "@/features/billing/components/connect-panel";
import { WebhookHealthPanel } from "@/features/billing/components/webhook-health-panel";
import { getOrgConnectStatus } from "@/features/billing/connect-data";
import { isStripeTestMode } from "@/features/billing/test-mode";
import { requireOrgPermission } from "@/features/organizations/context";
import { db } from "@/lib/db";

/**
 * Organization billing (spec 5.3, 5.5).
 *
 * Guarded by `billing.manage`, which is Owner-only — an Admin hitting this route
 * directly gets a real 403 via the shared chokepoint, exactly like every other
 * org page (spec 4.2). This is also the URL the payment provider returns the
 * browser to after checkout or a portal session.
 */
export default async function OrgBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const { org } = await requireOrgPermission("billing.manage");
  const t = await getTranslations("billing");
  const { connect } = await searchParams;
  const connectStatus = await db.transaction((tx) => getOrgConnectStatus(tx, org.id));
  const testMode = isStripeTestMode();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("heading")}</h1>
        <p className="text-muted-foreground text-sm">{org.name}</p>
      </div>

      {testMode ? (
        <div className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-sm">
          <span className="font-medium">Test Mode.</span>{" "}
          <span className="text-muted-foreground">
            Stripe is running against test keys — no real money moves. Payments will
            succeed but nothing is charged.
          </span>
        </div>
      ) : null}

      <BillingPanel owner={{ kind: "organization", organizationId: org.id }} />

      <ConnectPanel
        status={(connectStatus?.stripeConnectStatus ?? "not_connected") as ConnectAccountStatus}
        country={connectStatus?.country ?? null}
        chargesEnabled={connectStatus?.stripeConnectChargesEnabled ?? false}
        payoutsEnabled={connectStatus?.stripeConnectPayoutsEnabled ?? false}
        connectedAt={connectStatus?.stripeConnectConnectedAt?.toISOString() ?? null}
        countryRequired={connect === "country_required"}
        testMode={testMode}
      />

      {connectStatus?.stripeConnectAccountId ? (
        <WebhookHealthPanel orgId={org.id} />
      ) : null}
    </div>
  );
}
