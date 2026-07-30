"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { UpcomingSessionBlockData } from "@/lib/block-data";
import { UpcomingEvents } from "./index";

export type UpcomingEventsProps = {
  groupTypeId?: string;
  limit?: number;
  showForLoggedIn?: boolean;
  styles?: Record<string, string>;
  data?: UpcomingSessionBlockData[];
};

function Component(props: ChaiBlockComponentProps<UpcomingEventsProps>) {
  return <UpcomingEvents {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "UpcomingEvents",
  label: "Nadchodzące zajęcia",
  group: "Langlion",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("flex flex-col gap-3"),
      groupTypeId: {
        type: "string",
        title: "Oferta (opcjonalne)",
        default: "",
        ui: { "ui:widget": "groupTypePicker" },
      },
      limit: {
        type: "number",
        title: "Limit wyświetlania",
        default: 5,
      },
      showForLoggedIn: {
        type: "boolean",
        title: "Tylko dla zalogowanych",
        default: false,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };
