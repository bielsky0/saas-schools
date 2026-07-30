"use client";

import { useEffect, useState } from "react";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import type { TrainerBlockData } from "@/lib/block-data";
import type { InstructorCardProps } from "./config";

export function InstructorCard(
  props: ChaiBlockComponentProps<InstructorCardProps>,
) {
  const { trainerId, showSpecialization, showPhoto, data, inBuilder, styles, blockProps } =
    props;
  const [preview, setPreview] = useState<TrainerBlockData>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inBuilder || !trainerId) return;
    setPreview(null);
    setError(null);
    fetch(`/api/blocks/trainer?id=${trainerId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Nie znaleziono trenera");
        return r.json();
      })
      .then(setPreview)
      .catch((e: Error) => setError(e.message));
  }, [inBuilder, trainerId]);

  if (inBuilder && !trainerId) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6"
      >
        <p className="text-sm text-muted-foreground">
          Wybierz trenera w panelu konfiguracji
        </p>
      </div>
    );
  }

  const displayData = inBuilder ? preview : data;
  const hasError = inBuilder && error;

  if (hasError) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/10 p-6"
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!displayData) {
    return null;
  }

  return (
    <div
      {...blockProps}
      {...styles}
    >
      {showPhoto && (
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {displayData.image ? (
            <img
              src={displayData.image}
              alt={displayData.name ?? ""}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold text-muted-foreground">
              {displayData.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold">{displayData.name ?? "Brak imienia"}</p>
        <p className="text-sm text-muted-foreground">{displayData.email}</p>
        {showSpecialization && (
          <p className="mt-1 text-xs text-muted-foreground">Trener</p>
        )}
      </div>
    </div>
  );
}
