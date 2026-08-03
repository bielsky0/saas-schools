"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostContentProps } from "./config";

export function BlogPostContent(props: ChaiBlockComponentProps<BlogPostContentProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.body) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Treść posta" />;
  }

  return (
    <div
      {...blockProps}
      {...styles}
      // TipTap/HTML body — trusted admin content.
      dangerouslySetInnerHTML={{ __html: post.body }}
    />
  );
}
