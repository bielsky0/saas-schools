"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";
import { EnrollmentInstructors } from "./index";

export type EnrollmentInstructorsProps = {
  limit?: number;
  styles?: Record<string, string>;
  data?: EnrollmentPreview | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentInstructorsProps>) {
  return <EnrollmentInstructors {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentInstructors",
  label: "Trenerzy",
  group: "Enrollment",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      limit: {
        type: "number",
        title: "Limit trenerów",
        default: 4,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };