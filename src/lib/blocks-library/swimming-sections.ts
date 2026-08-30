import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

type SwimmingTemplate = {
  id: string;
  name: string;
  group: string;
  description: string;
  preview: string;
};

export const swimmingTemplates: SwimmingTemplate[] = [
  {
    id: "swimming-hero",
    name: "Hero — Basen",
    group: "Pływanie",
    description: "Sekcja hero z tłem basenu, tytułem i CTA zapisu",
    preview: "",
  },
  {
    id: "swimming-schedule",
    name: "Harmonogram zajęć",
    group: "Pływanie",
    description: "Siatka harmonogramu z dniami tygodnia i godzinami",
    preview: "",
  },
  {
    id: "swimming-coaches",
    name: "Trenerzy pływania",
    group: "Pływanie",
    description: "Karty trenerów ze zdjęciami i specjalizacjami",
    preview: "",
  },
  {
    id: "swimming-pricing",
    name: "Cennik",
    group: "Pływanie",
    description: "Tabela cen z pakietami i subskrypcjami",
    preview: "",
  },
  {
    id: "swimming-benefits",
    name: "Korzyści z pływania",
    group: "Pływanie",
    description: "Ikony z opisem korzyści zdrowotnych",
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

export function swimmingBlocks(templateId: string): ChaiBlock[] {
  switch (templateId) {
    case "swimming-hero":
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
          alt: "Basen pływacki",
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
          content: "Nauka pływania dla każdego",
          styles: `${STYLES_KEY},text-4xl font-bold text-white`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Profesjonalne lekcje pływania dla dzieci i dorosłych. Dołącz do naszej akademii!",
          styles: `${STYLES_KEY},text-lg text-white/90`,
        },
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Zapisz się na zajęcia",
          variant: "primary",
          styles: `${STYLES_KEY},w-fit`,
        },
      ]);

    case "swimming-schedule":
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
          _type: "Paragraph",
          _parent: parent,
          content: "Wybierz dogodny termin i dołącz do grupy",
          styles: `${STYLES_KEY},text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},grid grid-cols-2 md:grid-cols-4 gap-4`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Poniedziałek",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "16:00 — 17:00 Początkujący\n17:15 — 18:15 Średniozaawansowani",
          styles: `${STYLES_KEY},text-sm text-muted-foreground whitespace-pre-line`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Środa",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "16:00 — 17:00 Dzieci 5-8 lat\n17:15 — 18:15 Dzieci 9-12 lat",
          styles: `${STYLES_KEY},text-sm text-muted-foreground whitespace-pre-line`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Piątek",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "17:00 — 18:00 Zaawansowani\n18:15 — 19:15 Masters",
          styles: `${STYLES_KEY},text-sm text-muted-foreground whitespace-pre-line`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4 flex flex-col gap-2`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Sobota",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "10:00 — 11:00 Rekreacja\n11:15 — 12:15 Triathlon",
          styles: `${STYLES_KEY},text-sm text-muted-foreground whitespace-pre-line`,
        },
      ]);

    case "swimming-coaches":
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
          _type: "Paragraph",
          _parent: parent,
          content: "Doświadczeni instruktorzy z pasją do pływania",
          styles: `${STYLES_KEY},text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},grid grid-cols-1 md:grid-cols-3 gap-6`,
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

    case "swimming-pricing":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Cennik",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Wybierz pakiet dopasowany do Twoich potrzeb",
          styles: `${STYLES_KEY},text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "EnrollmentPricing",
          _parent: parent,
          styles: `${STYLES_KEY},`,
        },
      ]);

    case "swimming-benefits":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Dlaczego warto pływać?",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},grid grid-cols-1 md:grid-cols-3 gap-6`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex flex-col items-center text-center gap-3 p-6 rounded-lg border border-border`,
        },
        {
          _id: genId(),
          _type: "Icon",
          _parent: parent,
          icon: "Heart",
          styles: `${STYLES_KEY},h-10 w-10 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Zdrowie serca",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Pływanie wzmacnia układ krążenia i poprawia wydolność",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex flex-col items-center text-center gap-3 p-6 rounded-lg border border-border`,
        },
        {
          _id: genId(),
          _type: "Icon",
          _parent: parent,
          icon: "Dumbbell",
          styles: `${STYLES_KEY},h-10 w-10 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Siła mięśni",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Angażuje wszystkie grupy mięśniowe bez obciążania stawów",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex flex-col items-center text-center gap-3 p-6 rounded-lg border border-border`,
        },
        {
          _id: genId(),
          _type: "Icon",
          _parent: parent,
          icon: "Smile",
          styles: `${STYLES_KEY},h-10 w-10 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Dobry nastrój",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Endorfiny podczas pływania redukują stres i poprawiają sen",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    default:
      return [];
  }
}
