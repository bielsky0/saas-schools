"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { getGroupTypeBySlug } from "@/features/groups/data";
import { resolveClientSession } from "@/features/client-auth/session";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { assertConnectActive } from "@/features/billing/checkout";
import { startConnectCheckout } from "@/features/billing/connect-checkout";
import {
  createBooking,
  ForeignAthleteError,
  PaymentMethodUnavailableError,
  SessionCancelledError,
  SessionFullError,
  SessionPastError,
  UnknownSessionError,
} from "./create";
import { createBookingSchema } from "./schema";

/**
 * The public enrollment submission (F5, EPIK 4/6/14).
 *
 * NOT `requireOrgPermission` — the caller is a PARENT, not staff. And NOT
 * `requireClient`, which throws `ClientAuthRequiredError`: a form action returns a
 * `FormState`, so a missing or unverified session becomes a field message that
 * sends the flow back to the OTP step. The `isVerified` check is POSITIVE and
 * explicit, because that is the enforcement point for decision B — a booking is
 * created only after OTP, never inferred from "a session row exists".
 *
 * Never `redirect()`. A Server Action redirect is resolved internally by Next, so
 * the target renders without the locale prefix or `x-org-subdomain` (F4.6); the
 * flow advances client-side on the returned `bookingId` instead.
 */
export type CreateBookingState = FormState & {
  bookingId?: string;
  paymentStatus?: string;
  /** Stripe Checkout URL — set when online payment is needed. The UI redirects to it. */
  checkoutUrl?: string;
};

export async function createBookingAction(
  _prev: CreateBookingState,
  formData: FormData,
): Promise<CreateBookingState> {
  const org = await requireServedOrganization();

  const principal = await resolveClientSession(org.id);
  const [t, tv] = await Promise.all([
    getTranslations("enrollment"),
    getTranslations("bookings.validation"),
  ]);

  if (!principal || !principal.isVerified) {
    return { error: t("errors.verifyFirst") };
  }

  const rawParticipant =
    formData.get("participantKind") === "new"
      ? {
          kind: "new" as const,
          name: str(formData.get("participantName")),
          age: str(formData.get("participantAge")) || undefined,
        }
      : { kind: "existing" as const, athleteId: str(formData.get("athleteId")) };

  const parsed = createBookingSchema(tv).safeParse({
    groupTypeSlug: str(formData.get("groupTypeSlug")),
    sessionId: str(formData.get("sessionId")),
    paymentMethod: str(formData.get("paymentMethod")),
    participant: rawParticipant,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  try {
    const result = await withTenant(org.id, async (tx) => {
      const groupType = await getGroupTypeBySlug(tx, org.id, parsed.data.groupTypeSlug);
      if (!groupType) throw new UnknownSessionError(parsed.data.groupTypeSlug);

      return createBooking(tx, {
        organizationId: org.id,
        groupType: {
          id: groupType.id,
          price: groupType.price,
          paymentPolicy: groupType.paymentPolicy,
          allowedPurchaseModes: groupType.allowedPurchaseModes,
        },
        currency: org.currency,
        client: { id: principal.clientId, email: principal.email },
        sessionId: parsed.data.sessionId,
        paymentMethod: parsed.data.paymentMethod,
        participant: parsed.data.participant,
        // F11: online availability is determined by the org's Connect status.
        onlineAvailable: org.stripeConnectChargesEnabled ?? false,
      });
    });

    // ── Online payment: redirect to Stripe Checkout ─────────────────────
    // Called AFTER the booking transaction commits, never inside it — holding
    // a pooled connection across the Stripe HTTP round-trip is the deadlock
    // pattern documented in checkout.ts.
    let checkoutUrl: string | undefined;
    if (result.paymentStatus === "payment_pending") {
      // Gate: org must have an active Connect account (§2.25).
      await assertConnectActive(org.id);

      if (!org.stripeConnectAccountId) {
        throw new Error("org has no Connect account but payment_pending was created");
      }

      const checkout = await startConnectCheckout(
        org.id,
        org.subdomain,
        result.bookingId,
        result.priceSnapshot.amount,
        result.priceSnapshot.currency,
        org.stripeConnectAccountId,
      );

      if (checkout.ok) {
        checkoutUrl = checkout.url;
      } else {
        // Booking was created but Stripe Checkout failed. The booking remains
        // payment_pending — the parent can retry later or contact support.
        // No throw: the booking still exists, we just report the error.
      }
    }

    revalidatePath(`/zapisy/${parsed.data.groupTypeSlug}`);
    return {
      success: checkoutUrl ? undefined : t("done.booked"),
      bookingId: result.bookingId,
      paymentStatus: result.paymentStatus,
      checkoutUrl,
    };
  } catch (error) {
    return { error: messageFor(error, t) };
  }
}

function messageFor(error: unknown, t: Awaited<ReturnType<typeof getTranslations>>): string {
  if (error instanceof SessionFullError) return t("errors.sessionFull");
  if (error instanceof SessionCancelledError) return t("errors.sessionCancelled");
  if (error instanceof SessionPastError) return t("errors.sessionPast");
  if (error instanceof PaymentMethodUnavailableError) return t("errors.paymentMethodUnavailable");
  if (error instanceof ForeignAthleteError) return t("errors.foreignAthlete");
  if (error instanceof UnknownSessionError) return t("errors.unknownSession");
  throw error;
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
