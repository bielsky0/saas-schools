"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { EnrollmentBookingPayload } from "@/lib/enrollment-data";
import { EnrollmentBookingFlow } from "./index";

export type EnrollmentBookingFlowProps = {
  anchorId?: string;
  styles?: Record<string, string>;
  data?: EnrollmentBookingPayload | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentBookingFlowProps>) {
  return <EnrollmentBookingFlow {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentBookingFlow",
  label: "Formularz zapisu",
  group: "Enrollment",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      anchorId: {
        type: "string",
        title: "Kotwica (id sekcji)",
        default: "booking",
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };