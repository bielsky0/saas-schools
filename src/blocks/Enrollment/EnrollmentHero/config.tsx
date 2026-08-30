"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";
import { EnrollmentHero } from "./index";

export type EnrollmentHeroProps = {
  showPrice?: boolean;
  showDescription?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  styles?: Record<string, string>;
  data?: EnrollmentPreview | null;
};

function Component(props: ChaiBlockComponentProps<EnrollmentHeroProps>) {
  return <EnrollmentHero {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "EnrollmentHero",
  label: "Hero zapisu",
  group: "Enrollment",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      showPrice: {
        type: "boolean",
        title: "Pokaż cenę",
        default: true,
      },
      showDescription: {
        type: "boolean",
        title: "Pokaż opis",
        default: true,
      },
      ctaLabel: {
        type: "string",
        title: "Etykieta przycisku",
        default: "Przejdź do zapisu",
      },
      ctaHref: {
        type: "string",
        title: "Link przycisku (kotwica #booking)",
        default: "#booking",
      },
    },
  }),
  i18nProps: ["ctaLabel"],
};

export { Component, Config };