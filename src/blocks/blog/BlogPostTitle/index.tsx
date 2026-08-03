"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostTitleProps } from "./config";

export function BlogPostTitle(props: ChaiBlockComponentProps<BlogPostTitleProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.title) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Tytuł posta" />;
  }

  return (
    <h1 {...blockProps} {...styles}>
      {post.title}
    </h1>
  );
}
