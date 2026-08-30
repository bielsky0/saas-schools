"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";
import { EnrollmentSchedule } from "./index";

export type EnrollmentScheduleProps = {
  limit?: number;
  showTrainer?: boolean;
  showLocation?: boolean;
  styles?: Record<string, string>;
  data?: EnrollmentPreview | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentScheduleProps>) {
  return <EnrollmentSchedule {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentSchedule",
  label: "Harmonogram zajęć",
  group: "Enrollment",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      limit: {
        type: "number",
        title: "Limit sesji",
        default: 5,
      },
      showTrainer: {
        type: "boolean",
        title: "Pokaż prowadzącego",
        default: true,
      },
      showLocation: {
        type: "boolean",
        title: "Pokaż lokalizację",
        default: true,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };