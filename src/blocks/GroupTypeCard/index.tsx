"use client";

import { useEffect, useState } from "react";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import type { GroupTypeBlockData } from "@/lib/block-data";
import type { GroupTypeCardProps } from "./config";

function formatPrice(grosze: number): string {
  return `${(grosze / 100).toFixed(2).replace(".", ",")} zł`;
}

export function GroupTypeCard(
  props: ChaiBlockComponentProps<GroupTypeCardProps>,
) {
  const { groupTypeId, layout, showPrice, data, inBuilder, styles, blockProps } =
    props;
  const [preview, setPreview] = useState<GroupTypeBlockData>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inBuilder || !groupTypeId) return;
    setPreview(null);
    setError(null);
    fetch(`/api/blocks/group-type?id=${groupTypeId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Nie znaleziono oferty");
        return r.json();
      })
      .then(setPreview)
      .catch((e: Error) => setError(e.message));
  }, [inBuilder, groupTypeId]);

  if (inBuilder && !groupTypeId) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6"
      >
        <p className="text-sm text-muted-foreground">
          Wybierz ofertę w panelu konfiguracji
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

  const isDetailed = layout !== "compact";

  return (
    <div
      {...blockProps}
      {...styles}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{displayData.name}</h3>
          {isDetailed && displayData.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {displayData.description}
            </p>
          )}
        </div>
        {showPrice && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold">
              {formatPrice(displayData.price)}
            </p>
            <p className="text-xs text-muted-foreground">za zajęcia</p>
          </div>
        )}
      </div>
      {displayData.slug && (
        <a
          href={`/zapisy/${displayData.slug}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Zapisz się
        </a>
      )}
    </div>
  );
}
