"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";
import { EnrollmentPricing } from "./index";

export type EnrollmentPricingProps = {
  showSinglePrice?: boolean;
  showPackages?: boolean;
  styles?: Record<string, string>;
  data?: EnrollmentPreview | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentPricingProps>) {
  return <EnrollmentPricing {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentPricing",
  label: "Cennik zapisów",
  group: "Enrollment",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      showSinglePrice: {
        type: "boolean",
        title: "Pokaż cenę pojedynczych zajęć",
        default: true,
      },
      showPackages: {
        type: "boolean",
        title: "Pokaż pakiety / subskrypcje",
        default: true,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };