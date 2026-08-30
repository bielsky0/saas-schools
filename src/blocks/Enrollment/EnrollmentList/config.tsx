"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { EnrollmentList } from "./index";

export type EnrollmentListBlockItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string | null;
  status: string;
};

export type EnrollmentListProps = {
  columns?: "1" | "2" | "3";
  showPrice?: boolean;
  styles?: Record<string, string>;
  data?: { items: EnrollmentListBlockItem[] } | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentListProps>) {
  return <EnrollmentList {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentList",
  label: "Lista ofert",
  group: "Enrollment",
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
      showPrice: {
        type: "boolean",
        title: "Pokaż cenę",
        default: true,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };