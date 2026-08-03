"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder } from "../shared";
import type { BlogPostListProps, BlogPostListItem } from "./config";

function excerptOf(p: BlogPostListItem, max = 150): string {
  const source = p.excerpt?.trim() || "";
  if (!source) return "";
  if (source.length <= max) return source;
  const trimmed = source.slice(0, max).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + "…";
}

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(d));
}

export function BlogPostList(props: ChaiBlockComponentProps<BlogPostListProps>) {
  const { styles, blockProps, columns, showImage, showExcerpt, showDate, data, inBuilder } =
    props;
  const [posts, setPosts] = useState<BlogPostListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inBuilder) return;
    let cancelled = false;
    fetch("/editor/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "GET_BLOG_POSTS_LIST",
        data: { collectionId: "blog", limit: 6, offset: 0 },
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Nie udało się pobrać postów");
        return r.json();
      })
      .then((res) => {
        if (!cancelled) setPosts(res?.posts ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [inBuilder]);

  const displayPosts = inBuilder ? posts : data?.posts;
  const gridClass =
    columns === "1"
      ? "grid gap-8 sm:grid-cols-1"
      : columns === "2"
        ? "grid gap-8 sm:grid-cols-2"
        : "grid gap-8 sm:grid-cols-2 lg:grid-cols-3";

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

  if (!displayPosts) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Lista postów" />;
  }

  return (
    <div {...blockProps} {...styles} className={gridClass}>
      {displayPosts.map((p) => (
        <Link
          key={p.id}
          href={`/blog/${p.slug}`}
          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          {showImage && p.image ? (
            <div className="aspect-video overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          ) : null}
          <div className="flex flex-1 flex-col gap-2 p-5">
            {showDate && (
              <time className="text-sm text-muted-foreground">
                {formatDate(p.datePublished)}
              </time>
            )}
            <h2 className="text-xl font-semibold leading-tight text-foreground group-hover:underline">
              {p.title}
            </h2>
            {showExcerpt && excerptOf(p) ? (
              <p className="mt-auto line-clamp-3 text-sm text-muted-foreground">
                {excerptOf(p)}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
      {displayPosts.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          Brak opublikowanych wpisów.
        </p>
      )}
    </div>
  );
}
