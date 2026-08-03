"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPostList } from "./index";

export type BlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string | null;
  author: string | null;
  datePublished: string | null;
  tags: string[];
};

export type BlogPostListProps = {
  columns?: "1" | "2" | "3";
  showImage?: boolean;
  showExcerpt?: boolean;
  showDate?: boolean;
  styles?: Record<string, string>;
  data?: { posts: BlogPostListItem[] } | null;
};

function Component(props: ChaiBlockComponentProps<BlogPostListProps>) {
  return <BlogPostList {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPostList",
  label: "Lista postów",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      columns: {
        type: "string",
        title: "Kolumny",
        default: "3",
        oneOf: [
          { const: "1", title: "1" },
          { const: "2", title: "2" },
          { const: "3", title: "3" },
        ],
      },
      showImage: {
        type: "boolean",
        title: "Pokaż obraz",
        default: true,
      },
      showExcerpt: {
        type: "boolean",
        title: "Pokaż zajawkę",
        default: true,
      },
      showDate: {
        type: "boolean",
        title: "Pokaż datę",
        default: true,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };
