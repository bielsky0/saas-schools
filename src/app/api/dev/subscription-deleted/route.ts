import { NextResponse, type NextRequest } from "next/server";

import { processConnectSubscriptionEvent } from "@/features/billing/connect-webhooks";
import type { ConnectSubscriptionEvent } from "@/lib/adapters/billing";
import { env } from "@/lib/env/server";

/**
 * Test-only webhook simulator for subscription customer.subscription.deleted events (F12d).
 * Disabled in production.
 *
 * Simulates a customer.subscription.deleted event on the Connect webhook to
 * mark a subscription as canceled.
 */
type Body = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  eventId?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;

  if (!body.stripeSubscriptionId || !body.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: "missing required fields: stripeSubscriptionId, stripeCustomerId" },
      { status: 400 },
    );
  }

  const event: ConnectSubscriptionEvent = {
    provider: "stripe",
    id: body.eventId ?? `evt_sim_${crypto.randomUUID()}`,
    occurredAt: new Date(),
    accountId: "acct_simulated",
    type: "customer.subscription.deleted",
    stripeSubscriptionId: body.stripeSubscriptionId,
    stripeCustomerId: body.stripeCustomerId,
  };

  const result = await processConnectSubscriptionEvent(event);

  return NextResponse.json({
    ok: true,
    status: result.status,
  });
}
