"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BlogPagination } from "./index";

export type BlogPaginationProps = {
  itemsPerPage?: number;
  styles?: Record<string, string>;
  data?: { total: number; page: number; itemsPerPage: number } | null;
};

function Component(props: ChaiBlockComponentProps<BlogPaginationProps>) {
  return <BlogPagination {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BlogPagination",
  label: "Paginacja",
  group: "Blog",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      itemsPerPage: {
        type: "number",
        title: "Postów na stronę",
        default: 6,
        minimum: 1,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };
