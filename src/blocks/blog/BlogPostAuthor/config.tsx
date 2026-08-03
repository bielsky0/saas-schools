"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostAuthor } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostAuthorProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostAuthorProps>) {
  return <BlogPostAuthor {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostAuthor",
  label: "Autor posta",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("flex flex-wrap items-center gap-2 text-sm text-muted-foreground"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
