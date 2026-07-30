"use client";

import { registerChaiBlockProps, stylesProp } from "@chaibuilder/sdk/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "@chaibuilder/sdk/types";
import type { TrainerBlockData } from "@/lib/block-data";
import { InstructorCard } from "./index";

export type InstructorCardProps = {
  trainerId?: string;
  showSpecialization?: boolean;
  showPhoto?: boolean;
  styles?: Record<string, string>;
  data?: TrainerBlockData;
};

function Component(props: ChaiBlockComponentProps<InstructorCardProps>) {
  return <InstructorCard {...props} />;
}

const Config: ChaiBlockConfig = {
  type: "InstructorCard",
  label: "Profil trenera",
  group: "Langlion",
  category: "core",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("flex items-center gap-4 rounded-lg border bg-card p-6 shadow-sm"),
      trainerId: {
        type: "string",
        title: "Trener",
        default: "",
        ui: { "ui:widget": "trainerPicker" },
      },
      showSpecialization: {
        type: "boolean",
        title: "Pokaż specjalizację",
        default: true,
      },
      showPhoto: {
        type: "boolean",
        title: "Pokaż zdjęcie",
        default: true,
      },
    },
  }),
  i18nProps: [],
};

export { Component, Config };
