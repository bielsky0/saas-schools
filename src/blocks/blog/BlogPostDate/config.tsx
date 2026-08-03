"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostDate } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostDateProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostDateProps>) {
  return <BlogPostDate {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostDate",
  label: "Data publikacji",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("text-sm text-muted-foreground"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
