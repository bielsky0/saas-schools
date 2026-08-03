"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostTagsProps } from "./config";

export function BlogPostTags(props: ChaiBlockComponentProps<BlogPostTagsProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.tags?.length) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Tagi posta" />;
  }

  return (
    <div {...blockProps} {...styles}>
      {post.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
