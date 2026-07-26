"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import {
  createBooking,
  ForeignAthleteError,
  PaymentMethodUnavailableError,
  SessionCancelledError,
  SessionFullError,
  SessionPastError,
  UnknownSessionError,
} from "@/features/bookings/create";
import { resolveClientSession } from "@/features/client-auth/session";
import { getGroupType, getGroupTypeBySlug } from "@/features/groups/data";
import { requireOrgPermission } from "@/features/organizations/context";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { interestSignup } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { findInterestSignup, insertInterestSignup } from "./data";

export type ConvertInterestState = FormState & {
  bookingId?: string;
};

/**
 * Convert an interest signup into a real booking (Faza 22, EPIK 36, US-36.3).
 *
 * Goes through the FULL §5 protection (capacity, collision, payment policy) —
 * exactly the same mechanism as any other booking. Returns the booking id on
 * success, or a field-level error string on refusal.
 *
 * `interest.manage` permission required (§2.10). Conversion is always on_site
 * (the admin chooses the session, and payment is handled at the desk).
 */
export async function convertInterestSignupAction(
  _prev: ConvertInterestState,
  formData: FormData,
): Promise<ConvertInterestState> {
  const { org, session } = await requireOrgPermission("interest.manage");
  const t = await getTranslations("groups");

  const interestSignupId = formData.get("interestSignupId") as string;
  const sessionId = formData.get("sessionId") as string;

  if (!interestSignupId || !sessionId) {
    return { error: t("interest.convertMissingFields") };
  }

  const actor = await resolveActor(session);

  try {
    const result = await withTenant(org.id, async (tx) => {
      const [row] = await tx
        .select()
        .from(interestSignup)
        .where(
          and(
            eq(interestSignup.id, interestSignupId),
            eq(interestSignup.organizationId, org.id),
          ),
        )
        .limit(1);

      if (!row) return { kind: "not-found" as const };
      if (row.convertedBookingId) {
        return { kind: "already-converted", bookingId: row.convertedBookingId };
      }

      const gt = await getGroupType(tx, org.id, row.groupTypeId);
      if (!gt) return { kind: "group-type-gone" as const };

      const booking = await createBooking(tx, {
        organizationId: org.id,
        groupType: {
          id: gt.id,
          price: gt.price,
          paymentPolicy: gt.paymentPolicy,
          allowedPurchaseModes: gt.allowedPurchaseModes,
          requiresQualificationCard: false,
        },
        currency: org.currency,
        client: { id: row.clientId, email: "" },
        sessionId,
        paymentMethod: "on_site",
        participant: { kind: "existing", athleteId: row.athleteId },
        onlineAvailable: false,
      });

      await tx
        .update(interestSignup)
        .set({
          convertedBookingId: booking.bookingId,
          convertedAt: new Date(),
        })
        .where(
          and(
            eq(interestSignup.id, interestSignupId),
            eq(interestSignup.organizationId, org.id),
          ),
        );

      await recordAudit(tx, {
        action: "interest.convert",
        actor,
        organizationId: org.id,
        targetType: "interest_signup",
        targetId: interestSignupId,
        targetLabel: gt.name,
        metadata: {
          bookingId: booking.bookingId,
          athleteId: booking.athleteId,
          sessionId,
        },
      });

      return { kind: "converted", bookingId: booking.bookingId };
    });

    revalidatePath(`/dashboard/group-types/[groupTypeId]`, "page");

    if (result.kind === "already-converted") {
      return { success: t("interest.convertSuccess"), bookingId: result.bookingId };
    }
    if (result.kind === "not-found") return { error: t("interest.notFound") };
    if (result.kind === "group-type-gone") return { error: t("interest.groupTypeGone") };

    return { success: t("interest.convertSuccess"), bookingId: result.bookingId };
  } catch (error) {
    const te = await getTranslations("enrollment");
    if (error instanceof SessionFullError) return { error: te("errors.sessionFull") };
    if (error instanceof SessionCancelledError) return { error: te("errors.sessionCancelled") };
    if (error instanceof SessionPastError) return { error: te("errors.sessionPast") };
    if (error instanceof PaymentMethodUnavailableError) return { error: te("errors.paymentMethodUnavailable") };
    if (error instanceof ForeignAthleteError) return { error: te("errors.foreignAthlete") };
    if (error instanceof UnknownSessionError) return { error: te("errors.unknownSession") };
    throw error;
  }
}

export type CreateInterestSignupState = FormState;

/**
 * Submit interest in a collecting_interest offer (Faza 22, EPIK 36, §2.34).
 *
 * Creates an `interest_signup` row — no booking, no credit, no payment.
 * Constraint 13: submitting the same child to the same offer a second time
 * is a no-op (unique index on groupTypeId + athleteId).
 *
 * NOT `requireOrgPermission` — the caller is a PARENT on the public site.
 * Uses `requireServedOrganization` just like `createBookingAction`.
 */
export async function createInterestSignupAction(
  _prev: CreateInterestSignupState,
  formData: FormData,
): Promise<CreateInterestSignupState> {
  const org = await requireServedOrganization();

  const principal = await resolveClientSession(org.id);
  const t = await getTranslations("enrollment");

  if (!principal || !principal.isVerified) {
    return { error: t("errors.verifyFirst") };
  }

  const groupTypeSlug = formData.get("groupTypeSlug") as string;
  const athleteId = formData.get("athleteId") as string;
  const participantName = formData.get("participantName") as string;
  const participantAge = formData.get("participantAge") as string;

  if (!groupTypeSlug) {
    return { error: t("errors.generic") };
  }

  try {
    const result = await withTenant(org.id, async (tx) => {
      const gt = await getGroupTypeBySlug(tx, org.id, groupTypeSlug);
      if (!gt) throw new Error("unknownSession");
      if (gt.status !== "collecting_interest") {
        throw new Error("generic");
      }

      let targetAthleteId = athleteId;

      if (!targetAthleteId && participantName) {
        const { insertAthlete } = await import("@/features/clients/data");
        targetAthleteId = await insertAthlete(tx, org.id, principal.clientId, {
          name: participantName.trim(),
          age: participantAge ? parseInt(participantAge, 10) : undefined,
        });
      }

      if (!targetAthleteId) {
        throw new Error("generic");
      }

      const existing = await findInterestSignup(tx, org.id, gt.id, targetAthleteId);
      if (existing) {
        return { alreadySubmitted: true };
      }

      await insertInterestSignup(tx, {
        organizationId: org.id,
        groupTypeId: gt.id,
        clientId: principal.clientId,
        athleteId: targetAthleteId,
      });

      await recordAudit(tx, {
        action: "interest.signup",
        actor: await (async () => {
          const { clientActor } = await import("@/features/admin/audit");
          return clientActor(principal.clientId);
        })(),
        organizationId: org.id,
        targetType: "interest_signup",
        targetId: targetAthleteId,
        targetLabel: gt.name,
        metadata: { groupTypeId: gt.id, groupTypeSlug },
      });

      return { alreadySubmitted: false };
    });

    revalidatePath(`/zapisy/${groupTypeSlug}`);

    if (result.alreadySubmitted) {
      return { success: t("interest.alreadySubmitted") };
    }

    return { success: t("interest.done") };
  } catch (error) {
    if (error instanceof Error && error.message === "unknownSession") {
      return { error: t("errors.unknownSession") };
    }
    return { error: t("errors.generic") };
  }
}
