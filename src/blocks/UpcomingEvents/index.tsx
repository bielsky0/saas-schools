"use client";

import { useEffect, useState } from "react";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import type { UpcomingSessionBlockData } from "@/lib/block-data";
import { useClientSession } from "@/hooks/use-client-session";
import type { UpcomingEventsProps } from "./config";

function formatDateTime(dateStr: Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingEvents(
  props: ChaiBlockComponentProps<UpcomingEventsProps>,
) {
  const { groupTypeId, limit, showForLoggedIn, data, inBuilder, styles, blockProps } =
    props;
  const { client, isLoading: authLoading } = useClientSession();
  const [preview, setPreview] = useState<UpcomingSessionBlockData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inBuilder) return;
    setPreview(null);
    setError(null);
    const params = new URLSearchParams();
    if (groupTypeId) params.set("groupTypeId", groupTypeId);
    if (limit) params.set("limit", String(limit));
    fetch(`/api/blocks/upcoming-sessions?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Błąd ładowania");
        return r.json();
      })
      .then(setPreview)
      .catch((e: Error) => setError(e.message));
  }, [inBuilder, groupTypeId, limit]);

  const displayData = inBuilder ? preview : data ?? null;

  if (inBuilder && error) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/10 p-6"
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (showForLoggedIn && authLoading) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[80px] items-center justify-center"
      >
        <p className="text-sm text-muted-foreground">Sprawdzanie logowania...</p>
      </div>
    );
  }

  if (showForLoggedIn && !client) {
    return (
      <div
        {...blockProps}
        className="rounded-lg border bg-card p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Zaloguj się, aby zobaczyć najbliższe zajęcia
        </p>
      </div>
    );
  }

  if (!displayData || displayData.length === 0) {
    if (inBuilder && !groupTypeId) {
      return (
        <div
          {...blockProps}
          className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6"
        >
          <p className="text-sm text-muted-foreground">
            Wybierz ofertę w panelu konfiguracji (lub pozostaw puste dla wszystkich)
          </p>
        </div>
      );
    }
    return (
      <div
        {...blockProps}
        className="rounded-lg border bg-card p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Brak nadchodzących zajęć
        </p>
      </div>
    );
  }

  return (
    <div
      {...blockProps}
      {...styles}
    >
      {displayData.slice(0, limit ?? 5).map((session) => (
        <div
          key={session.id}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <p className="font-medium">{session.groupTypeName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(session.startTime)}
          </p>
          {session.locationName && (
            <p className="text-sm text-muted-foreground">
              {session.locationName}
            </p>
          )}
          {session.trainerName && (
            <p className="text-sm text-muted-foreground">
              Prowadzący: {session.trainerName}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
