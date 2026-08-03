"use client";

import { useBlogPostPreview } from "@chaibuilder/sdk/runtime";
import type { BlogPostPreview } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";

export type BlogBlockProps = {
  styles?: Record<string, string>;
  data?: BlogPostPreview | null;
};

export function useBlogPostData(
  props: ChaiBlockComponentProps<BlogBlockProps>,
): BlogPostPreview | null {
  const { preview } = useBlogPostPreview();
  return props.inBuilder ? preview : (props.data ?? null);
}

export function BlogBlockPlaceholder({
  blockProps,
  label,
}: {
  blockProps: Record<string, string>;
  label?: string;
}) {
  return (
    <div
      {...blockProps}
      className="flex min-h-[80px] w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center"
    >
      <p className="text-sm text-muted-foreground">
        {label ? `${label} — ` : ""}Wybierz post do podglądu
      </p>
    </div>
  );
}
