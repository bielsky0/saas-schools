"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostTitle } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostTitleProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostTitleProps>) {
  return <BlogPostTitle {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostTitle",
  label: "Tytuł posta",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("text-3xl font-semibold tracking-tight sm:text-4xl"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
