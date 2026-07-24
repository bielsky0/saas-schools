import { NextResponse, type NextRequest } from "next/server";

import { billing, type ConnectAccountEvent } from "@/lib/adapters/billing";
import {
  processConnectEvent,
  processConnectPaymentEvent,
  processConnectRefundEvent,
  processConnectSubscriptionEvent,
} from "@/features/billing/connect-webhooks";
import { requestLogger } from "@/lib/logger";

/**
 * Stripe Connect webhook endpoint (Faza 10 / EPIK 30).
 *
 * Deliberately UNAUTHENTICATED: Stripe has no session, so the request
 * SIGNATURE is the authentication. Uses a DIFFERENT signing secret than
 * the platform billing webhook (STRIPE_CONNECT_WEBHOOK_SECRET).
 *
 * Events handled:
 *   - account.updated → sync Connect account status
 *   - account.application.deauthorized → reset to not_connected
 *   - checkout.session.completed → booking, package, or subscription checkout
 *   - invoice.paid → subscription renewal credits (F12d)
 *   - invoice.payment_failed → subscription past_due (F12d)
 *   - customer.subscription.deleted → subscription canceled (F12d)
 *   - charge.refunded → refund confirmation, credits pending_refund→refunded (F16)
 *
 * The route is exempted from session checks by the same proxy rule as
 * the platform billing webhook (/api/billing/webhook prefix).
 *
 * Responses mirror the platform billing webhook convention:
 *   400 bad signature / unparseable payload
 *   404 no provider configured
 *   200 accepted, duplicate, ignored, or unknown account
 *   5xx infrastructure failure
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = await billing.verifyConnectWebhook(rawBody, request.headers);

  if (!result.ok) {
    if (result.code === "NOT_CONFIGURED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (result.code === "MALFORMED_PAYLOAD") {
      (await requestLogger("billing:connect:webhook")).error("rejected malformed payload");
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (result.status === "ignored") {
    return NextResponse.json({ received: true, status: "ignored" });
  }

  // Dispatch on event type.
  //
  // ConnectPaymentEvent (checkout.session.completed) → processConnectPaymentEvent
  //   Routes internally by metadata.purchaseKind to processBookingPayment,
  //   processPackagePurchase, or processSubscriptionInitial.
  //
  // ConnectSubscriptionEvent (invoice.* / customer.subscription.deleted) →
  //   processConnectSubscriptionEvent, which routes by .type.
  //
  // ConnectAccountEvent (account.updated / account.application.deauthorized) →
  //   processConnectEvent.
  const event = result.event;
  let processed: { status: string };
  if (event.type === "checkout.session.completed") {
    processed = await processConnectPaymentEvent(event);
  } else if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed" ||
    event.type === "customer.subscription.deleted"
  ) {
    processed = await processConnectSubscriptionEvent(event);
  } else if (event.type === "charge.refunded") {
    processed = await processConnectRefundEvent(event);
  } else {
    processed = await processConnectEvent(event as ConnectAccountEvent);
  }

  return NextResponse.json({ received: true, status: processed.status });
}
