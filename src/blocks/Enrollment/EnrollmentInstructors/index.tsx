"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { useEnrollmentData, EnrollmentBlockPlaceholder } from "../shared";
import type { EnrollmentInstructorsProps } from "./config";

export function EnrollmentInstructors(props: ChaiBlockComponentProps<EnrollmentInstructorsProps>) {
  const { styles, blockProps, limit } = props;
  const data = useEnrollmentData(props);
  const trainers = data?.trainers ?? [];

  if (!data?.groupType) {
    return <EnrollmentBlockPlaceholder blockProps={blockProps} label="Trenerzy" />;
  }

  if (trainers.length === 0) return null;

  const visible = trainers.slice(0, limit ?? 4);

  return (
    <div {...blockProps} {...styles} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-foreground">Nasi trenerzy</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((trainer) => (
          <div
            key={trainer.userId}
            className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {trainer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trainer.image}
                  alt={trainer.name ?? ""}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">
                  {trainer.name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{trainer.name ?? "Brak imienia"}</p>
              <p className="truncate text-sm text-muted-foreground">{trainer.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}