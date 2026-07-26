"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { resolveClientSession } from "@/features/client-auth/session";
import { getGroupTypeBySlug } from "@/features/groups/data";
import { getActivePolicyForGroupType } from "@/features/policies/data";
import { resolveClientPrice } from "@/features/pricing/resolve";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { assertConnectActive } from "@/features/billing/checkout";
import { startConnectCheckout } from "@/features/billing/connect-checkout";
import {
  ConsentRequiredError,
  createBooking,
  ForeignAthleteError,
  PaymentMethodUnavailableError,
  PolicyNotAcceptedError,
  PolicyVersionChangedError,
  QualificationCardRequiredError,
  SessionCancelledError,
  SessionFullError,
  SessionPastError,
  UnknownSessionError,
} from "./create";
import { createManyBookings, type CreateManyResult } from "./create-many";
import { createBookingSchema, createBookingManySchema } from "./schema";

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
    acceptedPolicyVersion: str(formData.get("acceptedPolicyVersion")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  try {
    const result = await withTenant(org.id, async (tx) => {
      const gt = await getGroupTypeBySlug(tx, org.id, parsed.data.groupTypeSlug);
      if (!gt) throw new UnknownSessionError(parsed.data.groupTypeSlug);

        const policyDoc = gt.policyDocumentId
          ? await getActivePolicyForGroupType(tx, org.id, gt.id)
          : null;
        const acceptedPolicyVersion = parsed.data.acceptedPolicyVersion;

        const resolvedPrice = await resolveClientPrice(
          tx,
          principal.clientId,
          gt.id,
          gt.price,
        );

        return createBooking(tx, {
          organizationId: org.id,
          groupType: {
            id: gt.id,
            price: resolvedPrice,
            paymentPolicy: gt.paymentPolicy,
            allowedPurchaseModes: gt.allowedPurchaseModes,
            requiresQualificationCard: gt.requiresQualificationCard,
          },
        currency: org.currency,
        client: { id: principal.clientId, email: principal.email },
        sessionId: parsed.data.sessionId,
        paymentMethod: parsed.data.paymentMethod,
        participant: parsed.data.participant,
        // F11: online availability is determined by the org's Connect status.
        onlineAvailable: org.stripeConnectChargesEnabled ?? false,
        policyDocument: policyDoc,
        acceptedPolicyVersion,
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
  if (error instanceof PolicyVersionChangedError) return t("errors.policyVersionChanged");
  if (error instanceof PolicyNotAcceptedError) return t("errors.policyNotAccepted");
  if (error instanceof ConsentRequiredError) return t("errors.consentRequired");
  if (error instanceof QualificationCardRequiredError) return t("errors.qualificationCardRequired");
  throw error;
}

/**
 * Multi-child enrollment submission (Faza 22, EPIK 40, §2.39, Constraint 15).
 *
 * A parent can enrol N children to the same session in a single pass.
 * Each child gets an INDEPENDENT `withTenant` transaction — failure of one
 * child does NOT roll back the committed booking of a sibling.
 *
 * Returns a partial-success report so the UI can show which children were
 * enrolled and which failed (and why).
 */
export type CreateBookingManyState = FormState & {
  report?: CreateManyResult;
};

export async function createBookingManyAction(
  _prev: CreateBookingManyState,
  formData: FormData,
): Promise<CreateBookingManyState> {
  const org = await requireServedOrganization();

  const principal = await resolveClientSession(org.id);
  const [t, tv] = await Promise.all([
    getTranslations("enrollment"),
    getTranslations("bookings.validation"),
  ]);

  if (!principal || !principal.isVerified) {
    return { error: t("errors.verifyFirst") };
  }

  const participants = parseManyParticipants(formData);

  const parsed = createBookingManySchema(tv).safeParse({
    groupTypeSlug: str(formData.get("groupTypeSlug")),
    sessionId: str(formData.get("sessionId")),
    paymentMethod: str(formData.get("paymentMethod")),
    participants,
    acceptedPolicyVersion: str(formData.get("acceptedPolicyVersion")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const { groupType, policyDoc, resolvedPrice } = await withTenant(org.id, async (tx) => {
    const gt = await getGroupTypeBySlug(tx, org.id, parsed.data.groupTypeSlug);
    if (!gt) throw new UnknownSessionError(parsed.data.groupTypeSlug);

    const doc = gt.policyDocumentId
      ? await getActivePolicyForGroupType(tx, org.id, gt.id)
      : null;
    const price = await resolveClientPrice(tx, principal.clientId, gt.id, gt.price);

    return { groupType: gt, policyDoc: doc, resolvedPrice: price };
  });

  const report = await createManyBookings(
    (fn) => withTenant(org.id, fn),
    {
      organizationId: org.id,
      organizationCurrency: org.currency,
      groupType: {
        id: groupType.id,
        price: resolvedPrice,
        paymentPolicy: groupType.paymentPolicy,
        allowedPurchaseModes: groupType.allowedPurchaseModes,
        requiresQualificationCard: groupType.requiresQualificationCard,
      },
      client: { id: principal.clientId, email: principal.email },
      sessionId: parsed.data.sessionId,
      paymentMethod: parsed.data.paymentMethod,
      participants: parsed.data.participants,
      onlineAvailable: org.stripeConnectChargesEnabled ?? false,
      policyDocument: policyDoc,
      acceptedPolicyVersion: parsed.data.acceptedPolicyVersion,
      athleteConsents: parseAthleteConsents(formData, participants.length),
    },
  );

  revalidatePath(`/zapisy/${parsed.data.groupTypeSlug}`);

  const created = report.results.filter((r) => !r.error).length;
  const total = report.results.length;

  if (created === 0) {
    const firstError = report.results.find((r) => r.error)?.error;
    return { error: messageForLabel(firstError, t), report };
  }

  if (created < total) {
    return {
      success: t("done.partialSuccess", { created, total }),
      report,
    };
  }

  return { success: t("done.booked"), report };
}

function parseManyParticipants(formData: FormData) {
  const count = parseInt(str(formData.get("participantCount")) || "1", 10);
  const participants: Array<{ kind: "existing"; athleteId: string } | { kind: "new"; name: string; age?: number }> = [];

  for (let i = 0; i < count; i++) {
    const kind = str(formData.get(`participantKind.${i}`));
    if (kind === "existing") {
      participants.push({
        kind: "existing",
        athleteId: str(formData.get(`athleteId.${i}`)),
      });
    } else {
      participants.push({
        kind: "new",
        name: str(formData.get(`participantName.${i}`)),
        age: parseInt(str(formData.get(`participantAge.${i}`)), 10) || undefined,
      });
    }
  }

  return participants;
}

function messageForLabel(label: string | undefined, t: Awaited<ReturnType<typeof getTranslations>>): string {
  switch (label) {
    case "sessionFull": return t("errors.sessionFull");
    case "sessionCancelled": return t("errors.sessionCancelled");
    case "sessionPast": return t("errors.sessionPast");
    case "paymentMethodUnavailable": return t("errors.paymentMethodUnavailable");
    case "foreignAthlete": return t("errors.foreignAthlete");
    case "unknownSession": return t("errors.unknownSession");
    case "policyVersionChanged": return t("errors.policyVersionChanged");
    case "policyNotAccepted": return t("errors.policyNotAccepted");
    case "consentRequired": return t("errors.consentRequired");
    case "qualificationCardRequired": return t("errors.qualificationCardRequired");
    default: return t("errors.generic");
  }
}

function parseAthleteConsents(
  formData: FormData,
  childCount: number,
): { consentDocumentId: string; granted: boolean }[][] | undefined {
  const consentCount = parseInt(str(formData.get("consentCount")) || "0", 10);
  if (consentCount === 0) return undefined;

  const docIds: string[] = [];
  for (let i = 0; i < consentCount; i++) {
    const docId = str(formData.get(`consentDocId.${i}`));
    if (docId) docIds.push(docId);
  }
  if (docIds.length === 0) return undefined;

  const result: { consentDocumentId: string; granted: boolean }[][] = [];
  for (let j = 0; j < childCount; j++) {
    const childConsents: { consentDocumentId: string; granted: boolean }[] = [];
    for (const docId of docIds) {
      const granted = str(formData.get(`consentGranted.${docId}.${j}`)) === "on";
      childConsents.push({ consentDocumentId: docId, granted });
    }
    result.push(childConsents);
  }
  return result;
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
