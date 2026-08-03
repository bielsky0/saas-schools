"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostImage } from "./index";
import type { BlogBlockProps } from "../shared";

export type BlogPostImageProps = BlogBlockProps;

function Component(props: ChaiBlockComponentProps<BlogPostImageProps>) {
  return <BlogPostImage {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostImage",
  label: "Obraz posta",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("aspect-video w-full rounded-xl bg-muted object-cover"),
    },
  }),
  i18nProps: [],
};

export { Component, Config };
