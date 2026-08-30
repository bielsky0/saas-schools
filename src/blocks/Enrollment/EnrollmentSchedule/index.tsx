"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { useEnrollmentData, EnrollmentBlockPlaceholder } from "../shared";
import type { EnrollmentScheduleProps } from "./config";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EnrollmentSchedule(props: ChaiBlockComponentProps<EnrollmentScheduleProps>) {
  const { styles, blockProps, limit, showTrainer, showLocation } = props;
  const data = useEnrollmentData(props);
  const sessions = data?.availability ?? [];
  const visible = sessions.slice(0, limit ?? 5);

  if (!data?.groupType) {
    return <EnrollmentBlockPlaceholder blockProps={blockProps} label="Harmonogram zapisów" />;
  }

  if (visible.length === 0) {
    return (
      <div {...blockProps} {...styles} className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Brak nadchodzących zajęć</p>
      </div>
    );
  }

  return (
    <div {...blockProps} {...styles} className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold text-foreground">Harmonogram zajęć</h2>
      {visible.map((session) => (
        <div key={session.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="font-medium text-foreground">{session.groupTypeName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(session.startTime)}</p>
          {showLocation && session.locationName ? (
            <p className="text-sm text-muted-foreground">{session.locationName}</p>
          ) : null}
          {showTrainer && session.trainerName ? (
            <p className="text-sm text-muted-foreground">Prowadzący: {session.trainerName}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}