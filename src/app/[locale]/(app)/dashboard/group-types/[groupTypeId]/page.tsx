import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { requireOrgPermission } from "@/features/organizations/context";
import { getEnrollmentTemplates } from "@/lib/enrollment-data";
import { getGroupType, listRecurrencesWithDetails } from "@/features/groups/data";
import { listLocations } from "@/features/locations/data";
import { listMembers } from "@/features/organizations/data";
import { listPolicyDocuments } from "@/features/policies/data";
import { GroupTypeForm } from "@/features/groups/components/group-type-form";
import { RecurrenceForm } from "@/features/groups/components/recurrence-form";
import { InterestSignupList } from "@/features/interest-signups/components/interest-signup-list";
import { listInterestSignups } from "@/features/interest-signups/data";
import { listSessionAvailability } from "@/features/bookings/data";
import { withTenant } from "@/lib/db/tenant";

/** Roles that may be scheduled to teach (§2.10). */
const TEACHING_ROLES = new Set(["trainer", "admin", "owner"]);

/**
 * One group type: its Definition, and the patterns that produce Realisations
 * (langlion EPIK 2, EPIK 3, §2.2).
 *
 * The two halves of Zasada nadrzędna #1 on one page, deliberately: the admin sees
 * that editing the Definition above leaves the already-generated sessions below
 * untouched (US-2.2), because both are in view at once.
 */
export default async function GroupTypeDetailPage({
  params,
}: {
  params: Promise<{ groupTypeId: string }>;
}) {
  const { groupTypeId } = await params;
  const { org } = await requireOrgPermission("group_types.manage");
  const [t, tr, td] = await Promise.all([
    getTranslations("groups"),
    getTranslations("groups.recurrences"),
    getTranslations("groups.days"),
  ]);

  const data = await withTenant(org.id, async (tx) => {
    const groupType = await getGroupType(tx, org.id, groupTypeId);
    if (!groupType) return null;
    const [recurrences, locations, members, policyDocuments, interestSignups, enrollmentTemplates] = await Promise.all([
      listRecurrencesWithDetails(tx, org.id, groupTypeId),
      listLocations(tx, org.id),
      listMembers(tx, org.id),
      listPolicyDocuments(tx, org.id),
      listInterestSignups(tx, org.id, groupTypeId),
      getEnrollmentTemplates(tx, org.id),
    ]);
    // Fetch future sessions for interest-to-booking conversion picker.
    const sessions = await listSessionAvailability(tx, org.id, {
      groupTypeId,
      from: new Date(),
      to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    return {
      groupType,
      recurrences,
      locations,
      members,
      policyDocuments,
      interestSignups,
      enrollmentTemplates,
      sessions,
    };
  });

  if (!data) notFound();

  // Trainers are boilerplate staff users (§2.19), so the candidate list is a
  // membership question rather than a domain table. Suspended/invited members are
  // excluded: scheduling someone who cannot yet log in produces a season nobody
  // can teach.
  const trainers = data.members
    .filter((member) => member.status === "active" && TEACHING_ROLES.has(member.role))
    // The email is part of the LABEL, not a fallback for a missing name. Two
    // trainers called Anna is an ordinary situation in an academy, and a picker
    // that renders them identically makes assigning the wrong one to a whole
    // season a one-click mistake with no visible symptom.
    .map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    }));

  const dayLabel = (day: number) => td(String(day) as "0" | "1" | "2" | "3" | "4" | "5" | "6");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start px-0">
          <Link href={`/dashboard/group-types`}>← {t("backToList")}</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{data.groupType.name}</h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/zapisy/${data.groupType.slug}`}>{t("viewPage")}</Link>
          </Button>
        </div>
        <p className="text-muted-foreground font-mono text-xs">/zapisy/{data.groupType.slug}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("form.editTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupTypeForm
            locations={data.locations}
            policyDocuments={data.policyDocuments}
            trainers={trainers}
            enrollmentTemplates={data.enrollmentTemplates}
            defaults={{
              id: data.groupType.id,
              name: data.groupType.name,
              slug: data.groupType.slug,
              description: data.groupType.description,
              engine: data.groupType.engine,
              paymentPolicy: data.groupType.paymentPolicy,
              status: data.groupType.status,
              price: data.groupType.price,
              isNewClientOnly: data.groupType.isNewClientOnly,
              requiresQualificationCard: data.groupType.requiresQualificationCard,
              isTrialOffer: data.groupType.isTrialOffer,
              defaultLocationId: data.groupType.defaultLocationId,
              defaultMeetingUrl: data.groupType.defaultMeetingUrl,
              policyDocumentId: data.groupType.policyDocumentId,
              allowedPurchaseModes: data.groupType.allowedPurchaseModes,
              allowedBillingTypes: data.groupType.allowedBillingTypes,
              eligibleTrainerIds: data.groupType.eligibleTrainerIds,
              defaultDurationMinutes: data.groupType.defaultDurationMinutes,
              enrollmentTemplateId: data.groupType.enrollmentTemplateId,
            }}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{tr("title")}</h2>
          <p className="text-muted-foreground text-sm">{tr("subtitle")}</p>
        </div>

        {data.recurrences.length === 0 ? (
          <p className="text-muted-foreground text-sm">{tr("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("table.when")}</TableHead>
                <TableHead>{tr("table.trainer")}</TableHead>
                <TableHead>{tr("table.location")}</TableHead>
                <TableHead>{tr("table.capacity")}</TableHead>
                <TableHead>{tr("table.occurrences")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recurrences.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {dayLabel(row.dayOfWeek)} {row.startTime}
                    <span className="text-muted-foreground"> · {row.durationMinutes}′</span>
                  </TableCell>
                  <TableCell>{row.trainerName || row.trainerEmail || "—"}</TableCell>
                  <TableCell>{row.locationName ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{row.capacity}</TableCell>
                  <TableCell>
                    {row.isRecurring ? (
                      // Future scheduled sessions vs what the pattern asks for.
                      // The pair is the useful reading: "12 / 30" says the season
                      // is under way, "0 / 30" says something refused to generate.
                      <span className="tabular-nums">
                        {row.generatedCount} / {row.occurrencesCount ?? "—"}
                      </span>
                    ) : (
                      <Badge variant="outline">{tr("table.oneOff")}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data.recurrences.map((row) => (
          <Card key={`edit-${row.id}`}>
            <CardHeader>
              <CardTitle className="text-sm">
                {tr("form.editTitle")} — {dayLabel(row.dayOfWeek)} {row.startTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecurrenceForm
                groupTypeId={groupTypeId}
                trainers={trainers}
                locations={data.locations}
                defaults={{
                  id: row.id,
                  dayOfWeek: row.dayOfWeek,
                  startTime: row.startTime,
                  durationMinutes: row.durationMinutes,
                  trainerId: row.trainerId,
                  capacity: row.capacity,
                  locationId: row.locationId,
                  isRecurring: row.isRecurring,
                  occurrencesCount: row.occurrencesCount,
                  startDate: row.startDate,
                }}
              />
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{tr("form.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RecurrenceForm
              groupTypeId={groupTypeId}
              trainers={trainers}
              locations={data.locations}
            />
          </CardContent>
        </Card>
      </section>

      <InterestSignupList
        rows={data.interestSignups.map((row) => ({
          id: row.id,
          athleteName: row.athleteName,
          clientName: row.clientName ?? row.clientEmail ?? "",
          clientEmail: row.clientEmail ?? "",
          createdAt: (row.createdAt as Date).toISOString().slice(0, 10),
          converted: row.convertedBookingId !== null,
          convertedBookingId: row.convertedBookingId,
        }))}
        sessions={data.sessions.map((s) => ({
          id: s.sessionId,
          label: `${s.startTime.toLocaleString()} — ${s.locationName ?? ""} (${s.activeCount}/${s.capacity})`,
        }))}
      />
 
    </div>
  );
}
