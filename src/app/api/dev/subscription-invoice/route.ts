import { NextResponse, type NextRequest } from "next/server";

import { processConnectSubscriptionEvent } from "@/features/billing/connect-webhooks";
import type { ConnectSubscriptionEvent } from "@/lib/adapters/billing";
import { env } from "@/lib/env/server";

/**
 * Test-only webhook simulator for subscription invoice.paid events (F12d).
 * Disabled in production.
 *
 * Simulates an invoice.paid event on the Connect webhook to trigger
 * subscription renewal credit issuance and auto-fill.
 */
type Body = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  invoiceId?: string;
  amount?: number;
  currency?: string;
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
    type: "invoice.paid",
    stripeSubscriptionId: body.stripeSubscriptionId,
    stripeCustomerId: body.stripeCustomerId,
    invoiceId: body.invoiceId ?? `in_sim_${crypto.randomUUID()}`,
    amount: body.amount ?? 0,
    currency: body.currency ?? "pln",
  };

  const result = await processConnectSubscriptionEvent(event);

  return NextResponse.json({
    ok: true,
    status: result.status,
  });
}
