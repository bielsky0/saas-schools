"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostTags } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostTagsProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostTagsProps>) {
  return <BlogPostTags {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostTags",
  label: "Tagi posta",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("flex flex-wrap gap-2"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
