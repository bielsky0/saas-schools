"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostContent } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostContentProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostContentProps>) {
  return <BlogPostContent {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostContent",
  label: "Treść posta",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("prose prose-neutral dark:prose-invert max-w-none"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
