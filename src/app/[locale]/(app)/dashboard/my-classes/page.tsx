import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui";
import { requireOrgAccess } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { listUpcomingSessions } from "@/features/schedule/data";
import { listRosterForSession } from "@/features/bookings/data";
import { listGradeFieldsForSessionRoster } from "@/features/grades/data";
import { listGradesForBooking, listProgressNotesForBooking } from "@/features/grades/data";
import { getLessonTopicBySession, listHomeworkBySession, getCompletionMap } from "@/features/lesson-logs/data";
import { classSession, booking } from "@/lib/db/schema";
import MyClassesClient from "./page-client";

export default async function MyClassesPage() {
  const { session, org } = await requireOrgAccess();
  const t = await getTranslations("trainer.myClasses");

  const sessions = await withTenant(org.id, async (tx) => {
    const now = new Date();
    const all = await tx
      .select({
        id: classSession.id,
        startTime: classSession.startTime,
        endTime: classSession.endTime,
        capacity: classSession.capacity,
        status: classSession.status,
        meetingUrl: classSession.meetingUrl,
        groupTypeId: classSession.groupTypeId,
      })
      .from(classSession)
      .where(
        and(
          eq(classSession.organizationId, org.id),
          eq(classSession.trainerId, session.user.id),
          eq(classSession.status, "scheduled"),
        ),
      )
      .orderBy(desc(classSession.startTime));

    const enriched = await Promise.all(
      all.map(async (s) => {
        const [roster, topic, homeworkEntries, gradeFields] = await Promise.all([
          listRosterForSession(tx, org.id, s.id),
          getLessonTopicBySession(tx, org.id, s.id),
          listHomeworkBySession(tx, org.id, s.id),
          listGradeFieldsForSessionRoster(tx, org.id, {
            groupTypeId: s.groupTypeId,
            sessionId: s.id,
          }),
        ]);

        const gradesPerBooking = await Promise.all(
          roster.map(async (r) => {
            const grades = await listGradesForBooking(tx, org.id, r.bookingId);
            const notes = await listProgressNotesForBooking(tx, org.id, r.bookingId);
            return { bookingId: r.bookingId, grades, notes };
          }),
        );

        const homeworkIds = homeworkEntries.map((h) => h.id);
        const completionMap =
          homeworkIds.length > 0
            ? await getCompletionMap(tx, org.id, homeworkIds)
            : new Map();

        const [activeCount] = await tx
          .select({ count: count() })
          .from(booking)
          .where(
            and(
              eq(booking.organizationId, org.id),
              eq(booking.sessionId, s.id),
              eq(booking.paymentStatus, "confirmed"),
            ),
          );

        return {
          ...s,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          roster,
          topic,
          homework: homeworkEntries.map((h) => ({
            ...h,
            dueDate: h.dueDate ?? null,
          })),
          homeworkCompletionMap: Object.fromEntries(
            [...completionMap.entries()].map(([hwId, athleteMap]) => [
              hwId,
              Object.fromEntries(athleteMap.entries()),
            ]),
          ),
          grades: Object.fromEntries(
            gradesPerBooking.map((g) => [g.bookingId, { grades: g.grades, notes: g.notes }]),
          ),
          gradeFields: gradeFields.map((f) => ({
            id: f.id,
            name: f.name,
            fieldType: f.fieldType,
            minValue: f.minValue,
            maxValue: f.maxValue,
          })),
          participantCount: Number(activeCount!.count),
        };
      }),
    );

    return enriched;
  });

  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <MyClassesClient sessions={sessions} />
    </Suspense>
  );
}
