import { and, desc, eq } from "drizzle-orm";

import { athlete, booking, grade, gradeField, progressNote } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * E-dziennik data access (langlion §2.33, EPIK 35, v16, Faza 6).
 *
 * Same conventions as every other langlion DAL: a `TenantDb` handle, and an
 * explicit `organizationId` filter that RLS backs up rather than replaces.
 */

/** Fields configured for every session of one offer. */
export async function listGradeFieldsForGroupType(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
) {
  return tx
    .select()
    .from(gradeField)
    .where(
      and(eq(gradeField.organizationId, organizationId), eq(gradeField.groupTypeId, groupTypeId)),
    );
}

/** Ad-hoc fields defined on one specific session. */
export async function listGradeFieldsForSession(
  tx: TenantDb,
  organizationId: string,
  sessionId: string,
) {
  return tx
    .select()
    .from(gradeField)
    .where(and(eq(gradeField.organizationId, organizationId), eq(gradeField.sessionId, sessionId)));
}

/** Every field applicable to a session: its group type's, plus its own ad-hoc ones. */
export async function listGradeFieldsForSessionRoster(
  tx: TenantDb,
  organizationId: string,
  params: { groupTypeId: string; sessionId: string },
) {
  const [groupTypeFields, sessionFields] = await Promise.all([
    listGradeFieldsForGroupType(tx, organizationId, params.groupTypeId),
    listGradeFieldsForSession(tx, organizationId, params.sessionId),
  ]);
  return [...groupTypeFields, ...sessionFields];
}

export async function getGradeField(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select()
    .from(gradeField)
    .where(and(eq(gradeField.id, id), eq(gradeField.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/** All grades entered for one booking, keyed by field. */
export async function listGradesForBooking(tx: TenantDb, organizationId: string, bookingId: string) {
  return tx
    .select()
    .from(grade)
    .where(and(eq(grade.organizationId, organizationId), eq(grade.bookingId, bookingId)));
}

/** The one grade a booking has for a given field, or null (see `grade_field_booking_uq`). */
export async function getGradeForBookingField(
  tx: TenantDb,
  organizationId: string,
  params: { bookingId: string; gradeFieldId: string },
) {
  const [row] = await tx
    .select()
    .from(grade)
    .where(
      and(
        eq(grade.organizationId, organizationId),
        eq(grade.bookingId, params.bookingId),
        eq(grade.gradeFieldId, params.gradeFieldId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Every note about one booking, a running log rather than one current value. */
export async function listProgressNotesForBooking(
  tx: TenantDb,
  organizationId: string,
  bookingId: string,
) {
  return tx
    .select()
    .from(progressNote)
    .where(and(eq(progressNote.organizationId, organizationId), eq(progressNote.bookingId, bookingId)));
}

/**
 * Every grade entered for any child of one parent (US-35.6, F13).
 *
 * ⚠️ `clientId` MUST come from `resolveClientSession()` (server-side session
 * cookie), never from a query param or request body — this is how the scope
 * is enforced. The join through `booking → athlete.parentClientId` ensures
 * a parent sees only their own children's grades.
 */
export async function listGradesForClient(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
) {
  return tx
    .select({
      id: grade.id,
      fieldName: gradeField.name,
      fieldType: gradeField.fieldType,
      value: grade.value,
      athleteName: athlete.name,
      athleteId: athlete.id,
      bookingId: grade.bookingId,
      createdAt: grade.createdAt,
    })
    .from(grade)
    .innerJoin(
      booking,
      and(eq(grade.bookingId, booking.id), eq(grade.organizationId, booking.organizationId)),
    )
    .innerJoin(
      athlete,
      and(eq(booking.athleteId, athlete.id), eq(athlete.organizationId, booking.organizationId)),
    )
    .innerJoin(
      gradeField,
      and(eq(grade.gradeFieldId, gradeField.id), eq(gradeField.organizationId, grade.organizationId)),
    )
    .where(
      and(
        eq(grade.organizationId, organizationId),
        eq(athlete.parentClientId, clientId),
      ),
    )
    .orderBy(desc(grade.createdAt));
}

/**
 * Every progress note for any child of one parent (US-35.6, F13).
 *
 * Same security rule as `listGradesForClient`: `clientId` from the session,
 * never from user-supplied input.
 */
export async function listProgressNotesForClient(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
) {
  return tx
    .select({
      id: progressNote.id,
      content: progressNote.content,
      athleteName: athlete.name,
      athleteId: athlete.id,
      bookingId: progressNote.bookingId,
      createdAt: progressNote.createdAt,
    })
    .from(progressNote)
    .innerJoin(
      booking,
      and(
        eq(progressNote.bookingId, booking.id),
        eq(progressNote.organizationId, booking.organizationId),
      ),
    )
    .innerJoin(
      athlete,
      and(eq(booking.athleteId, athlete.id), eq(athlete.organizationId, booking.organizationId)),
    )
    .where(
      and(
        eq(progressNote.organizationId, organizationId),
        eq(athlete.parentClientId, clientId),
      ),
    )
    .orderBy(desc(progressNote.createdAt));
}
