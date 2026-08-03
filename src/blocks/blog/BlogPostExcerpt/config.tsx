"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostExcerpt } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostExcerptProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostExcerptProps>) {
  return <BlogPostExcerpt {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostExcerpt",
  label: "Zajawka posta",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("text-lg text-muted-foreground text-balance"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
