"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostAuthorProps } from "./config";

export function BlogPostAuthor(props: ChaiBlockComponentProps<BlogPostAuthorProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.author) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Autor posta" />;
  }

  return (
    <div {...blockProps} {...styles}>
      <span className="font-medium text-foreground">{post.author}</span>
    </div>
  );
}
