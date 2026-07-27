import { sql } from "drizzle-orm";

import { withTenant } from "@/lib/db/tenant";
import { servedOrganization } from "@/features/organizations/served-org";

export { scheduleGridBlock } from "./schedule-grid-block";

type ScheduleGridProps = {
  title?: string | null;
  groupTypeIds?: string[] | string | null;
  maxSessions?: number | null;
};

type SessionRow = {
  id: string;
  groupTypeName: string;
  locationName: string;
  startTime: string;
};

export async function ScheduleGrid({ title, groupTypeIds, maxSessions }: ScheduleGridProps) {
  const org = await servedOrganization();
  if (!org) return null;

  const ids = groupTypeIds
    ? Array.isArray(groupTypeIds)
      ? groupTypeIds
      : [groupTypeIds]
    : [];

  const sessions = await withTenant(org.id, async (tx) => {
    let query = sql`
      SELECT cs.id, gt.name AS group_type_name, l.name AS location_name, cs.start_time
      FROM class_session cs
      JOIN group_type gt ON gt.id = cs.group_type_id
      JOIN location l ON l.id = cs.location_id
      WHERE cs.organization_id = ${org.id}
        AND cs.start_time > now()
        AND cs.deleted_at IS NULL
        AND gt.deleted_at IS NULL
    `;

    if (ids.length > 0) {
      query = sql`
        ${query}
        AND cs.group_type_id = ANY(${sql.join(ids.map((id) => sql`${id}::text`), sql`, `)}::text[])
      `;
    }

    query = sql`
      ${query}
      ORDER BY cs.start_time ASC
      LIMIT ${maxSessions ?? 10}
    `;

    return tx.execute<SessionRow>(query);
  });

  if (!sessions.length) {
    return (
      <section className="px-4 py-16">
        {title && <h2 className="mb-8 text-center text-3xl font-bold">{title}</h2>}
        <p className="text-center text-muted-foreground">No upcoming sessions scheduled.</p>
      </section>
    );
  }

  return (
    <section className="px-4 py-16">
      {title && <h2 className="mb-8 text-center text-3xl font-bold">{title}</h2>}
      <div className="mx-auto max-w-3xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 font-medium">Class</th>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 font-medium">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {(sessions as SessionRow[]).map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-2">{s.groupTypeName}</td>
                <td className="px-4 py-2">{s.locationName}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatDate(s.startTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
