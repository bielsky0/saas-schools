"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostDateProps } from "./config";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

export function BlogPostDate(props: ChaiBlockComponentProps<BlogPostDateProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.datePublished) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Data publikacji" />;
  }

  return (
    <time {...blockProps} {...styles} dateTime={post.datePublished}>
      {formatDate(post.datePublished)}
    </time>
  );
}
