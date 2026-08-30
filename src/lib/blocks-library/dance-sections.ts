import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

type DanceTemplate = {
  id: string;
  name: string;
  group: string;
  description: string;
  preview: string;
};

export const danceTemplates: DanceTemplate[] = [
  {
    id: "dance-hero",
    name: "Hero — Taniec",
    group: "Taniec",
    description: "Sekcja hero z tłem sali tanecznej i CTA zapisu",
    preview: "",
  },
  {
    id: "dance-gallery",
    name: "Galeria zajęć",
    group: "Taniec",
    description: "Siatka zdjęć z zajęć tanecznych",
    preview: "",
  },
  {
    id: "dance-schedule",
    name: "Harmonogram",
    group: "Taniec",
    description: "Lista zajęć z dniami i godzinami",
    preview: "",
  },
  {
    id: "dance-levels",
    name: "Poziomy zaawansowania",
    group: "Taniec",
    description: "Progresja poziomów od początkującego do zaawansowanego",
    preview: "",
  },
  {
    id: "dance-cta",
    name: "CTA zapisu",
    group: "Taniec",
    description: "Sekcja z przyciskiem zapisu i opisem",
    preview: "",
  },
];

const STYLES_KEY = "#styles:";

function genId(): string {
  return nanoid();
}

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

export function danceBlocks(templateId: string): ChaiBlock[] {
  switch (templateId) {
    case "dance-hero":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},relative w-full h-96 rounded-xl overflow-hidden`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Sala taneczna",
          styles: `${STYLES_KEY},absolute inset-0 w-full h-full object-cover`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},absolute inset-0 bg-gradient-to-t from-black/70 to-transparent`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},absolute bottom-0 left-0 p-8 flex flex-col gap-3`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h1",
          content: "Odkryj radość tańca",
          styles: `${STYLES_KEY},text-4xl font-bold text-white`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Zajęcia taneczne dla dzieci i dorosłych. Poczuj rytm i wyraź siebie!",
          styles: `${STYLES_KEY},text-lg text-white/90`,
        },
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Przyjdź na próbę",
          variant: "primary",
          styles: `${STYLES_KEY},w-fit`,
        },
      ]);

    case "dance-gallery":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Zajęcia w obiektywie",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},grid grid-cols-2 lg:grid-cols-3 gap-4`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zajęcia salsa",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zajęcia hip-hop",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zajęcia balet",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zajęcia swing",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Pokaz taneczny",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Grupa na zajęciach",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
      ]);

    case "dance-schedule":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Harmonogram zajęć",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "EnrollmentSchedule",
          _parent: parent,
          styles: `${STYLES_KEY},`,
        },
      ]);

    case "dance-levels":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Twoja ścieżka taneczna",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Od pierwszych kroków do zaawansowanych choreografii",
          styles: `${STYLES_KEY},text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex flex-col md:flex-row gap-4`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex-1 rounded-lg border border-border p-6 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Początkujący",
          styles: `${STYLES_KEY},font-semibold text-primary`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Podstawowe kroki, rytmika, koordynacja. Dla osób bez doświadczenia.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex-1 rounded-lg border border-border p-6 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Średniozaawansowany",
          styles: `${STYLES_KEY},font-semibold text-primary`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Złożone figury, improwizacja, praca w parach. Po ukończeniu poziomu 1.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex-1 rounded-lg border border-border p-6 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Zaawansowany",
          styles: `${STYLES_KEY},font-semibold text-primary`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Choreografie, styling, przygotowanie do pokazów i konkursów.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    case "dance-cta":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},text-center py-12 px-6 rounded-xl bg-primary/5`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Gotowy na pierwszy taniec?",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Pierwsza lekcja próbna jest bezpłatna. Przyjdź i przekonaj się, czy taniec jest dla Ciebie!",
          styles: `${STYLES_KEY},text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Zarezerwuj lekcję próbną",
          variant: "primary",
          styles: `${STYLES_KEY},self-center`,
        },
      ]);

    default:
      return [];
  }
}
