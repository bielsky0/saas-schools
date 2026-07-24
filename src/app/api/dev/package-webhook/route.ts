import { NextResponse, type NextRequest } from "next/server";

import { processConnectPaymentEvent } from "@/features/billing/connect-webhooks";
import type { ConnectPaymentEvent, PurchaseKind } from "@/lib/adapters/billing";
import { env } from "@/lib/env/server";

/**
 * Test-only webhook simulator for online package purchases and subscription
 * initial checkouts. Disabled in production.
 *
 * Simulates a checkout.session.completed event on the Connect webhook.
 * Used by the e2e spec to verify the full webhook → credits → auto-fill
 * pipeline (for packages) or webhook → client_subscription creation (for
 * subscriptions) without going through Stripe.
 */
type Body = {
  organizationId: string;
  clientId: string;
  creditTypeId: string;
  productTemplateId: string;
  quantity: number;
  sessionId?: string;
  eventId?: string;
  purchaseKind?: PurchaseKind;
  subscriptionId?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;

  if (!body.organizationId || !body.clientId || !body.creditTypeId || !body.productTemplateId || !body.quantity) {
    return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
  }

  const isSubscription = body.purchaseKind === "subscription_initial";

  const event: ConnectPaymentEvent = {
    provider: "stripe",
    id: body.eventId ?? `evt_sim_${crypto.randomUUID()}`,
    occurredAt: new Date(),
    accountId: "acct_simulated",
    type: "checkout.session.completed",
    sessionId: body.sessionId ?? `cs_sim_${crypto.randomUUID()}`,
    paymentStatus: "paid",
    amount: 0,
    currency: "pln",
    metadata: {
      organizationId: body.organizationId,
      clientId: body.clientId,
      creditTypeId: body.creditTypeId,
      productTemplateId: body.productTemplateId,
      quantity: String(body.quantity),
      purchaseKind: body.purchaseKind ?? "package_purchase",
    },
    ...(isSubscription
      ? { subscriptionId: body.subscriptionId ?? `sub_sim_${crypto.randomUUID()}` }
      : {}),
  };

  const result = await processConnectPaymentEvent(event);

  return NextResponse.json({
    ok: true,
    status: result.status,
  });
}
