"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";
import { EnrollmentPolicy } from "./index";

export type EnrollmentPolicyProps = {
  showConsents?: boolean;
  styles?: Record<string, string>;
  data?: EnrollmentPreview | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentPolicyProps>) {
  return <EnrollmentPolicy {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentPolicy",
  label: "Zasady zapisu",
  group: "Enrollment",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      showConsents: {
        type: "boolean",
        title: "Pokaż zgody",
        default: true,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };