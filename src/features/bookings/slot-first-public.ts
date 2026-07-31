"use server";

import { and, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { clientActor, recordAudit } from "@/features/admin/audit";
import { assertConnectActive } from "@/features/billing/checkout";
import { startConnectCheckout } from "@/features/billing/connect-checkout";
import { resolveClientSession } from "@/features/client-auth/session";
import { getGroupTypeBySlug } from "@/features/groups/data";
import { emitDomainNotification } from "@/features/notifications/emit";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { getActivePolicyForGroupType } from "@/features/policies/data";
import { resolveClientPrice } from "@/features/pricing/resolve";
import { listAvailability } from "@/features/trainers/availability-data";
import { computeAvailabilitySlots } from "@/features/trainers/availability-slots";
import { getTrainer } from "@/features/trainers/data";
import { athlete, classSession } from "@/lib/db/schema";
import {
  CONSTRAINT_SESSION_TRAINER_OVERLAP,
  constraintOf,
  SQLSTATE_EXCLUSION_VIOLATION,
  sqlStateOf,
} from "@/lib/db/sql-error";
import { withTenant } from "@/lib/db/tenant";
import { wallClockToInstant, zonedDayKey, zonedPartsOf, zonedWallClockToUtc } from "@/lib/datetime";
import type { FormState } from "@/lib/validation";
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
import { createSlotFirstBookingSchema } from "./schema";

/**
 * Public slot-first enrollment (Faza 5, EPIK 34, §2.32).
 *
 * The parent picks a trainer and a local start time from the availability the
 * page computed with `computeAvailabilitySlots` (US-1.2 — a wall-clock slot, not
 * an instant). This action does NOT trust that the slot is still free: it
 * recomputes the trainer's availability inside the transaction (the same pure
 * function, over the same windows) and only proceeds when the requested slot is
 * in the result — the CHECK at the database is still the final word, so a
 * collision between the recompute and the insert surfaces as a 23P01 on
 * `class_session_trainer_no_overlap_excl` and becomes a friendly message below.
 *
 * The session is created on the fly (capacity 1, per the slot-first contract) and
 * the booking transaction in `create.ts` takes its seat — one transaction, so a
 * failed booking leaves no orphan session.
 */
export type CreateSlotFirstState = FormState & {
  bookingId?: string;
  paymentStatus?: string;
  /** Stripe Checkout URL — set when online payment is needed. The UI redirects to it. */
  checkoutUrl?: string;
};

/** Internal markers — a `"use server"` module may only export async functions. */
class TrainerNotEligibleError extends Error {}
class SlotUnavailableError extends Error {}

export async function createSlotFirstBookingAction(
  _prev: CreateSlotFirstState,
  formData: FormData,
): Promise<CreateSlotFirstState> {
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

  const rawStart = str(formData.get("startTime"));

  const parsed = createSlotFirstBookingSchema(tv).safeParse({
    groupTypeSlug: str(formData.get("groupTypeSlug")),
    trainerId: str(formData.get("trainerId")),
    startTime: rawStart,
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
      if (gt.engine !== "slot_first") throw new UnknownSessionError(parsed.data.groupTypeSlug);

      const trainer = await getTrainer(tx, org.id, parsed.data.trainerId);
      if (!trainer) throw new TrainerNotEligibleError();

      // Eligibility: restricted to `eligibleTrainerIds` when the academy set any.
      if (gt.eligibleTrainerIds && gt.eligibleTrainerIds.length > 0) {
        if (!gt.eligibleTrainerIds.includes(parsed.data.trainerId)) {
          throw new TrainerNotEligibleError();
        }
      }

      // The slot a parent can pick is a local wall-clock time (US-1.2). Resolve
      // it to an instant in the academy's zone, then recompute the trainer's
      // availability for that local day to confirm the slot is genuinely open.
      const startInstant = wallClockToInstant(parsed.data.startTime, org.timezone);
      if (typeof startInstant === "string") throw new SlotUnavailableError();

      const durationMinutes = gt.defaultDurationMinutes ?? 60;
      const local = zonedPartsOf(startInstant, org.timezone);
      const dayFrom = zonedWallClockToUtc(local.year, local.month, local.day, 0, 0, org.timezone);
      const dayTo = zonedWallClockToUtc(local.year, local.month, local.day + 1, 0, 0, org.timezone);

      const [windows, existing] = await Promise.all([
        listAvailability(tx, org.id, { trainerId: parsed.data.trainerId }),
        tx
          .select({ startTime: classSession.startTime, endTime: classSession.endTime })
          .from(classSession)
          .where(
            and(
              eq(classSession.organizationId, org.id),
              eq(classSession.trainerId, parsed.data.trainerId),
              eq(classSession.status, "scheduled"),
              gte(classSession.startTime, dayFrom),
              lt(classSession.startTime, dayTo),
            ),
          ),
      ]);

      const slots = computeAvailabilitySlots({
        windows: windows
          .filter((w) => w.isActive)
          .map((w) => ({ dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime })),
        existingSessions: existing,
        defaultDurationMinutes: durationMinutes,
        dateFrom: dayFrom,
        dateTo: dayTo,
        timeZone: org.timezone,
      });

      const requestedDay = zonedDayKey(startInstant, org.timezone);
      const requestedStart = `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
      const isOpen = slots.some((s) => s.dayKey === requestedDay && s.startsAt === requestedStart);
      if (!isOpen) throw new SlotUnavailableError();

      const endInstant = new Date(startInstant.getTime() + durationMinutes * 60000);

      const [sessionRow] = await tx
        .insert(classSession)
        .values({
          organizationId: org.id,
          groupTypeId: gt.id,
          trainerId: parsed.data.trainerId,
          startTime: startInstant,
          endTime: endInstant,
          capacity: 1,
          locationId: gt.defaultLocationId,
        })
        .returning({ id: classSession.id });
      if (!sessionRow) throw new Error("slot_first insert returned no row");

      await recordAudit(tx, {
        actor: clientActor(principal.email),
        organizationId: org.id,
        action: "class_session.create",
        targetType: "class_session",
        targetId: sessionRow.id,
        targetLabel: startInstant.toISOString(),
        metadata: { groupTypeId: gt.id, engine: "slot_first", via: "public_enrollment" },
      });

      const policyDoc = gt.policyDocumentId
        ? await getActivePolicyForGroupType(tx, org.id, gt.id)
        : null;

      const resolvedPrice = await resolveClientPrice(tx, principal.clientId, gt.id, gt.price);

      const booking = await createBooking(tx, {
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
        sessionId: sessionRow.id,
        paymentMethod: parsed.data.paymentMethod,
        participant: parsed.data.participant,
        onlineAvailable: org.stripeConnectChargesEnabled ?? false,
        policyDocument: policyDoc,
        acceptedPolicyVersion: parsed.data.acceptedPolicyVersion,
        athleteConsents: parseAthleteConsents(formData),
      });

      // Faza 5 — notifications (outbox, inside the transaction). The parent gets
      // the booking confirmation, the trainer gets the new-session assignment.
      // Data is loaded here with `tx` (we already hold it) — the same shape
      // `cancel.ts` uses, minus the FOR UPDATE concern (the session row lock is
      // already taken by `createBooking`).
      const [athleteRow] = await tx
        .select({ name: athlete.name })
        .from(athlete)
        .where(and(eq(athlete.id, booking.athleteId), eq(athlete.organizationId, org.id)))
        .limit(1);

      const { sessionDate, sessionTime } = formatSessionDate(startInstant, org.timezone);
      const athleteName = athleteRow?.name ?? "—";

      await emitDomainNotification(tx, {
        eventType: "booking-confirmed",
        organizationId: org.id,
        accountId: null,
        recipients: [
          {
            kind: "client",
            clientId: principal.clientId,
            email: principal.email,
            name: principal.name ?? undefined,
            locale: "pl",
          },
        ],
        params: {
          orgName: org.name,
          athleteName,
          groupTypeName: gt.name,
          trainerName: trainer.name ?? trainer.email,
          sessionDate,
          sessionTime,
        },
        dedupeBasis: `booking-confirmed:${booking.bookingId}`,
      });

      await emitDomainNotification(tx, {
        eventType: "slot-first-session-created",
        organizationId: org.id,
        accountId: null,
        recipients: [
          {
            kind: "staff",
            userId: trainer.userId,
            email: trainer.email,
            name: trainer.name ?? undefined,
            locale: "pl",
          },
        ],
        params: {
          orgName: org.name,
          athleteName,
          groupTypeName: gt.name,
          sessionDate,
          sessionTime,
        },
        link: `/dashboard/schedule`,
        dedupeBasis: `slot-first-session-created:${booking.bookingId}`,
      });

      return booking;
    });

    // ── Online payment: redirect to Stripe Checkout ─────────────────────
    // Same contract as `createBookingAction` — after the transaction commits,
    // never inside it (see checkout.ts on pooled connections).
    let checkoutUrl: string | undefined;
    if (result.paymentStatus === "payment_pending") {
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
  if (error instanceof TrainerNotEligibleError) return t("errors.trainerNotEligible");
  if (error instanceof SlotUnavailableError) return t("errors.slotUnavailable");
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
  // The recompute above caught most collisions, but the EXCLUDE constraint is
  // the final word — a slot that vanished between the two is a trainer conflict.
  if (sqlStateOf(error) === SQLSTATE_EXCLUSION_VIOLATION) {
    if (constraintOf(error) === CONSTRAINT_SESSION_TRAINER_OVERLAP) {
      return t("errors.trainerConflict");
    }
    return t("errors.slotUnavailable");
  }
  throw error;
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * F24 — consent documents checked in the slot-first confirm step. A single
 * child (capacity 1), so the shape matches `createBooking`'s `athleteConsents`.
 */
function parseAthleteConsents(
  formData: FormData,
): { consentDocumentId: string; granted: boolean }[] | undefined {
  const consentCount = parseInt(str(formData.get("consentCount")) || "0", 10);
  if (consentCount === 0) return undefined;

  const consents: { consentDocumentId: string; granted: boolean }[] = [];
  for (let i = 0; i < consentCount; i++) {
    const docId = str(formData.get(`consentDocId.${i}`));
    if (!docId) continue;
    const granted = str(formData.get(`consentGranted.${docId}.0`)) === "on";
    consents.push({ consentDocumentId: docId, granted });
  }
  return consents.length > 0 ? consents : undefined;
}

/** Local `YYYY-MM-DD` + `HH:MM` readings of an instant in the academy's zone. */
function formatSessionDate(
  date: Date,
  timeZone: string,
): { sessionDate: string; sessionTime: string } {
  const dateStr = date.toLocaleDateString("pl", { timeZone, dateStyle: "medium" });
  const timeStr = date.toLocaleTimeString("pl", { timeZone, timeStyle: "short" });
  return { sessionDate: dateStr, sessionTime: timeStr };
}
