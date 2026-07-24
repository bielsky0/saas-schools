import { NextResponse, type NextRequest } from "next/server";

import { clientStripeCustomer } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env/server";

/**
 * Test-only endpoint to create a client_stripe_customer mapping (F12d).
 * Disabled in production.
 *
 * Used by e2e tests to set up the Stripe customer id mapping before
 * simulating webhook events.
 */
type Body = {
  organizationId: string;
  clientId: string;
  stripeCustomerId: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;

  if (!body.organizationId || !body.clientId || !body.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: "missing required fields" },
      { status: 400 },
    );
  }

  await withTenant(body.organizationId, async (tx) => {
    await tx.insert(clientStripeCustomer).values({
      organizationId: body.organizationId,
      clientId: body.clientId,
      stripeCustomerId: body.stripeCustomerId,
    }).onConflictDoNothing();
  });

  return NextResponse.json({ ok: true });
}
