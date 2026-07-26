import { getActivePolicyForGroupType } from "@/features/policies/data";
import type { TenantDb } from "@/lib/db/tenant";
import {
  createBooking,
  ForeignAthleteError,
  PaymentMethodUnavailableError,
  PolicyNotAcceptedError,
  PolicyVersionChangedError,
  SessionCancelledError,
  SessionFullError,
  SessionPastError,
  UnknownSessionError,
} from "./create";

/**
 * Multi-child enrollment orkiestrator (Faza 22, EPIK 40, §2.39, Constraint 15).
 *
 * Loops `createBooking` per child in N INDEPENDENT `withTenant` transactions
 * (separate top-level COMMITs, NOT a single transaction with savepoints).
 * Constraint 15 requires that failure of one child does NOT roll back the
 * sibling's committed booking — each child gets its own `withTenant` call
 * that COMMITs before the next one begins.
 *
 * Because each child's transaction is independent, capacity and collision
 * checks in `createBooking` work exactly as they do for single bookings —
 * a child that finds the session full blocks ONLY itself, not its siblings
 * that were already committed or will be tried next.
 *
 * `createBooking` stays single-child (unchanged) — this file is the ONLY
 * call site that loops it, and future single-child consumers (F6/F11/F15)
 * call it directly and are unaffected.
 */

export type CreateManyParticipant = {
  kind: "existing";
  athleteId: string;
} | {
  kind: "new";
  name: string;
  age?: number;
};

export interface CreateManyInput {
  organizationId: string;
  organizationCurrency: string;
  groupType: {
    id: string;
    price: number;
    paymentPolicy: "online" | "on_site" | "both";
    allowedPurchaseModes: readonly ("single_class" | "package")[];
  };
  client: { id: string; email: string };
  sessionId: string;
  paymentMethod: "online" | "on_site";
  participants: CreateManyParticipant[];
  onlineAvailable: boolean;
  policyDocument?: { id: string; version: number } | null;
  acceptedPolicyVersion?: number;
}

export interface CreateManyResultEntry {
  athleteId?: string;
  bookingId?: string;
  paymentStatus?: string;
  error?: string;
}

export interface CreateManyResult {
  results: CreateManyResultEntry[];
}

/**
 * Run one `withTenant` transaction per child (Constraint 15).
 *
 * The caller passes a factory function `withTx` that opens a new
 * top-level transaction. Each iteration calls `withTx(tx => createBooking(tx, ...))`
 * and gathers the result or error. Failures of later children do not affect
 * the committed bookings of earlier ones.
 */
export async function createManyBookings(
  withTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>,
  input: CreateManyInput,
): Promise<CreateManyResult> {
  const results: CreateManyResultEntry[] = [];

  for (const participant of input.participants) {
    try {
      const result = await withTx(async (tx) => {
        const resolvedPrice = input.groupType.price;

        const policyDoc = input.policyDocument
          ? await getActivePolicyForGroupType(tx, input.organizationId, input.groupType.id)
          : null;

        return createBooking(tx, {
          organizationId: input.organizationId,
          groupType: {
            id: input.groupType.id,
            price: resolvedPrice,
            paymentPolicy: input.groupType.paymentPolicy,
            allowedPurchaseModes: input.groupType.allowedPurchaseModes,
          },
          currency: input.organizationCurrency,
          client: input.client,
          sessionId: input.sessionId,
          paymentMethod: input.paymentMethod,
          participant,
          onlineAvailable: input.onlineAvailable,
          policyDocument: policyDoc,
          acceptedPolicyVersion: input.acceptedPolicyVersion,
        });
      });

      results.push({
        athleteId: result.athleteId,
        bookingId: result.bookingId,
        paymentStatus: result.paymentStatus,
      });
    } catch (error) {
      results.push({
        error: createManyErrorLabel(error),
      });
    }
  }

  return { results };
}

function createManyErrorLabel(error: unknown): string {
  if (error instanceof SessionFullError) return "sessionFull";
  if (error instanceof SessionCancelledError) return "sessionCancelled";
  if (error instanceof SessionPastError) return "sessionPast";
  if (error instanceof PaymentMethodUnavailableError) return "paymentMethodUnavailable";
  if (error instanceof ForeignAthleteError) return "foreignAthlete";
  if (error instanceof UnknownSessionError) return "unknownSession";
  if (error instanceof PolicyVersionChangedError) return "policyVersionChanged";
  if (error instanceof PolicyNotAcceptedError) return "policyNotAccepted";
  throw error;
}
