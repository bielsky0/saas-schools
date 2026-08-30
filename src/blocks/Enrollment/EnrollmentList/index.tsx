"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { formatPrice } from "../shared";
import type { EnrollmentListBlockItem, EnrollmentListProps } from "./config";

export function EnrollmentList(props: ChaiBlockComponentProps<EnrollmentListProps>) {
  const { styles, blockProps, columns, showPrice, data, inBuilder } = props;
  const [items, setItems] = useState<EnrollmentListBlockItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inBuilder) return;
    let cancelled = false;
    fetch("/api/blocks/group-types-list")
      .then((r) => {
        if (!r.ok) throw new Error("Nie udało się pobrać ofert");
        return r.json();
      })
      .then((rows) => {
        if (!cancelled) setItems(rows ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [inBuilder]);

  const displayItems = inBuilder ? items : data?.items;
  const gridClass =
    columns === "1"
      ? "grid gap-6 sm:grid-cols-1"
      : columns === "2"
        ? "grid gap-6 sm:grid-cols-2"
        : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

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

  if (!displayItems) {
    return (
      <div
        {...blockProps}
        className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6"
      >
        <p className="text-sm text-muted-foreground">Lista ofert — wybierz z panelu</p>
      </div>
    );
  }

  return (
    <div {...blockProps} {...styles} className={gridClass}>
      {displayItems.map((item) => (
        <Link
          key={item.id}
          href={`/zapisy/${item.slug}`}
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-xl font-semibold leading-tight text-foreground group-hover:underline">
            {item.name}
          </h3>
          {item.description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
          {showPrice ? (
            <p className="mt-auto text-lg font-bold text-foreground">{formatPrice(item.price)}</p>
          ) : null}
        </Link>
      ))}
      {displayItems.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">Brak aktywnych ofert.</p>
      )}
    </div>
  );
}