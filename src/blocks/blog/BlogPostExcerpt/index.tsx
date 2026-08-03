"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostExcerptProps } from "./config";

export function BlogPostExcerpt(props: ChaiBlockComponentProps<BlogPostExcerptProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.excerpt) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Zajawka posta" />;
  }

  return (
    <p {...blockProps} {...styles}>
      {post.excerpt}
    </p>
  );
}
