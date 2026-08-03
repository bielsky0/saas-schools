"use client";

import type { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { BlogBlockPlaceholder, useBlogPostData } from "../shared";
import type { BlogPostImageProps } from "./config";

export function BlogPostImage(props: ChaiBlockComponentProps<BlogPostImageProps>) {
  const { styles, blockProps } = props;
  const post = useBlogPostData(props);

  if (!post?.image) {
    return <BlogBlockPlaceholder blockProps={blockProps} label="Obraz posta" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...blockProps} {...styles} src={post.image} alt="" />
  );
}
