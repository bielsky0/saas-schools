import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

type LanglionTemplate = {
  id: string;
  name: string;
  group: string;
  description: string;
  preview: string;
};

const TEMPLATES: LanglionTemplate[] = [
  {
    id: "langlion-upcoming",
    name: "Nadchodzące zajęcia",
    group: "Langlion",
    description: "Sekcja z nagłówkiem i listą nadchodzących zajęć",
    preview: "",
  },
  {
    id: "langlion-offer-cta",
    name: "Oferta z zapisem",
    group: "Langlion",
    description: "Karta oferty z przyciskiem zapisu",
    preview: "",
  },
  {
    id: "langlion-offer",
    name: "Karta oferty",
    group: "Langlion",
    description: "Pojedyncza karta oferty zajęć",
    preview: "",
  },
  {
    id: "langlion-trainers",
    name: "Nasi trenerzy",
    group: "Langlion",
    description: "Sekcja z profilem dwóch trenerów",
    preview: "",
  },
  {
    id: "langlion-book-btn",
    name: "Przycisk zapisu",
    group: "Langlion",
    description: "Wyśrodkowany przycisk zapisu do oferty",
    preview: "",
  },
];

function genId(): string {
  return nanoid();
}

const STYLES_KEY = "#styles:";

function buildBlocks(getBlock: (id: string) => Record<string, unknown>[]): ChaiBlock[] {
  const id = genId();
  const blocks: Record<string, unknown>[] = [
    {
      _id: id,
      _type: "Box",
      _parent: null,
      styles: `${STYLES_KEY},flex flex-col gap-6 p-6`,
      tag: "div",
    },
    ...getBlock(id),
  ];
  return blocks as ChaiBlock[];
}

function templateBlocks(templateId: string): ChaiBlock[] {
  switch (templateId) {
    case "langlion-upcoming":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Nadchodzące zajęcia",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "UpcomingEvents",
          _parent: parent,
          limit: 5,
          showForLoggedIn: false,
          groupTypeId: "",
          styles: `${STYLES_KEY},`,
        },
      ]);

    case "langlion-offer-cta":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "GroupTypeCard",
          _parent: parent,
          groupTypeId: "",
          layout: "detailed",
          showPrice: true,
          styles: `${STYLES_KEY},`,
        },
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Zapisz się teraz",
          variant: "primary",
          styles: `${STYLES_KEY},self-center`,
        },
      ]);

    case "langlion-offer":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "GroupTypeCard",
          _parent: parent,
          groupTypeId: "",
          layout: "detailed",
          showPrice: true,
          styles: `${STYLES_KEY},`,
        },
      ]);

    case "langlion-trainers":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Nasi trenerzy",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "InstructorCard",
          _parent: parent,
          trainerId: "",
          showSpecialization: true,
          showPhoto: true,
          styles: `${STYLES_KEY},`,
        },
        {
          _id: genId(),
          _type: "InstructorCard",
          _parent: parent,
          trainerId: "",
          showSpecialization: true,
          showPhoto: true,
          styles: `${STYLES_KEY},`,
        },
      ]);

    case "langlion-book-btn":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Zapisz się",
          variant: "primary",
          styles: `${STYLES_KEY},self-center`,
        },
      ]);

    default:
      return [];
  }
}

export const langlionLibrary = {
  name: "Langlion",
  description: "Gotowe sekcje dla akademii",
  getBlocksList: async () => TEMPLATES,
  getBlock: async ({
    block,
  }: {
    block: LanglionTemplate;
  }): Promise<ChaiBlock[]> => {
    return templateBlocks(block.id);
  },
};
