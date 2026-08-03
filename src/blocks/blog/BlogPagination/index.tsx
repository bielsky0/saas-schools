"use client";

import Link from "next/link";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder } from "../shared";
import type { BlogPaginationProps } from "./config";

export function BlogPagination(props: ChaiBlockComponentProps<BlogPaginationProps>) {
  const { styles, blockProps, itemsPerPage, data, inBuilder } = props;

  if (inBuilder) {
    return (
      <BlogBlockPlaceholder
        blockProps={blockProps}
        label="Paginacja — widoczna tylko na publicznej stronie"
      />
    );
  }

  const perPage = data?.itemsPerPage ?? itemsPerPage ?? 6;
  const total = data?.total ?? 0;
  const current = data?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasPrev = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav {...blockProps} {...styles} aria-label="Paginacja" className="flex items-center justify-center gap-4">
      {hasPrev ? (
        <Link
          href={`?page=${current - 1}`}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          ← Poprzednia
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="cursor-not-allowed rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground"
        >
          ← Poprzednia
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Strona {current} / {totalPages}
      </span>
      {hasNext ? (
        <Link
          href={`?page=${current + 1}`}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Następna →
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="cursor-not-allowed rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground"
        >
          Następna →
        </span>
      )}
    </nav>
  );
}
