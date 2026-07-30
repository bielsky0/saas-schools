"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import { BookingButton } from "./index";

export type BookingButtonProps = {
  groupTypeSlug?: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  styles?: Record<string, string>;
};

function Component(props: ChaiBlockComponentProps<BookingButtonProps>) {
  return <BookingButton {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "BookingButton",
  label: "Przycisk zapisu",
  group: "Langlion",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      groupTypeSlug: {
        type: "string",
        title: "Slug oferty",
        default: "",
      },
      label: {
        type: "string",
        title: "Etykieta",
        default: "Zapisz się",
      },
      variant: {
        type: "string",
        title: "Wariant",
        default: "primary",
        oneOf: [
          { const: "primary", title: "Podstawowy" },
          { const: "secondary", title: "Drugorzędny" },
          { const: "outline", title: "Konturowy" },
        ],
      },
    },
  }),
  i18nProps: ["label"],
};

export { Component, Config };
