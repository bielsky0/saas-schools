"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { GroupTypeBlockData } from "@/lib/block-data";
import { GroupTypeCard } from "./index";

export type GroupTypeCardProps = {
  groupTypeId?: string;
  layout?: "compact" | "detailed";
  showPrice?: boolean;
  styles?: Record<string, string>;
  data?: GroupTypeBlockData;
};

function Component(props: ChaiBlockComponentProps<GroupTypeCardProps>) {
  return <GroupTypeCard {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "GroupTypeCard",
  label: "Karta oferty",
  group: "Langlion",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm"),
      groupTypeId: {
        type: "string",
        title: "Oferta",
        default: "",
        ui: { "ui:widget": "groupTypePicker" },
      },
      layout: {
        type: "string",
        title: "Układ",
        default: "detailed",
        oneOf: [
          { const: "compact", title: "Kompaktowy" },
          { const: "detailed", title: "Rozszerzony" },
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
