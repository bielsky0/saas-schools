import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

type SchoolTemplate = {
  id: string;
  name: string;
  group: string;
  description: string;
  preview: string;
};

export const schoolTemplates: SchoolTemplate[] = [
  {
    id: "school-hero",
    name: "Hero — Szkoła",
    group: "Szkoła",
    description: "Sekcja hero z hasłem szkoły i CTA zapisu",
    preview: "",
  },
  {
    id: "school-program",
    name: "Program nauczania",
    group: "Szkoła",
    description: "Siatka przedmiotów z opisem i ikonami",
    preview: "",
  },
  {
    id: "school-teachers",
    name: "Nasi nauczyciele",
    group: "Szkoła",
    description: "Karty nauczycieli ze zdjęciami i specjalizacjami",
    preview: "",
  },
  {
    id: "school-testimonials",
    name: "Opinie rodziców",
    group: "Szkoła",
    description: "Karuzela opinii od rodziców uczniów",
    preview: "",
  },
  {
    id: "school-contact",
    name: "Formularz kontaktowy",
    group: "Szkoła",
    description: "Formularz zapisu z polami imię, email, telefon",
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

export function schoolBlocks(templateId: string): ChaiBlock[] {
  switch (templateId) {
    case "school-hero":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},text-center py-16 px-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h1",
          content: "Twoje dziecko zasługuje na najlepszą edukację",
          styles: `${STYLES_KEY},text-4xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Korepetycje z doświadczonymi nauczycielami. Małe grupy, indywidualne podejście, wymierne efekty.",
          styles: `${STYLES_KEY},text-lg text-muted-foreground max-w-2xl mx-auto`,
        },
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Umów lekcję próbną",
          variant: "primary",
          styles: `${STYLES_KEY},self-center`,
        },
      ]);

    case "school-program":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Program nauczania",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Oferujemy korepetycje z przedmiotów szkolnych na każdym poziomie",
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
          styles: `${STYLES_KEY},flex flex-col items-center text-center gap-3 p-6 rounded-lg border border-border`,
        },
        {
          _id: genId(),
          _type: "Icon",
          _parent: parent,
          icon: "Calculator",
          styles: `${STYLES_KEY},h-8 w-8 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Matematyka",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Podstawowa, rozszerzona, maturalna",
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
          icon: "Globe",
          styles: `${STYLES_KEY},h-8 w-8 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Angielski",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Konwersacje, gramatyka, przygotowanie do egzaminów",
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
          icon: "FlaskConical",
          styles: `${STYLES_KEY},h-8 w-8 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Fizyka",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Mechanika, optyka, elektryczność",
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
          icon: "BookOpen",
          styles: `${STYLES_KEY},h-8 w-8 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Polski",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Język polski, literatura, ortografia",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    case "school-teachers":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Nasi nauczyciele",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Doświadczeni pedagodzy z pasją do nauczania",
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

    case "school-testimonials":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Co mówią rodzice?",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},grid grid-cols-1 md:grid-cols-2 gap-6`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-6 flex flex-col gap-3`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "\u201EM\u00F3j syn podchodzi\u0142 do matury z matematyki i dosta\u0142 85%. Polecam t\u0119 szko\u0142\u0119 ka\u017Cdemu!\u201D",
          styles: `${STYLES_KEY},italic text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "— Anna K.",
          styles: `${STYLES_KEY},font-semibold text-sm`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-6 flex flex-col gap-3`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "\u201EC\u00F3rka polubi\u0142a angielski dzi\u0119ki indywidualnemu podej\u015Bciu nauczycieli. Wreszcie chce si\u0119 uczy\u0107!\u201D",
          styles: `${STYLES_KEY},italic text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "— Marek T.",
          styles: `${STYLES_KEY},font-semibold text-sm`,
        },
      ]);

    case "school-contact":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Skontaktuj się z nami",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Wypełnij formularz, a oddzwonimy w ciągu 24 godzin",
          styles: `${STYLES_KEY},text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},grid grid-cols-1 md:grid-cols-2 gap-4`,
        },
        {
          _id: genId(),
          _type: "Input",
          _parent: parent,
          label: "Imię rodzica",
          placeholder: "Jan Kowalski",
          styles: `${STYLES_KEY},`,
        },
        {
          _id: genId(),
          _type: "Input",
          _parent: parent,
          label: "Email",
          placeholder: "jan@example.com",
          styles: `${STYLES_KEY},`,
        },
        {
          _id: genId(),
          _type: "Input",
          _parent: parent,
          label: "Telefon",
          placeholder: "+48 123 456 789",
          styles: `${STYLES_KEY},`,
        },
        {
          _id: genId(),
          _type: "Input",
          _parent: parent,
          label: "Przedmiot",
          placeholder: "np. Matematyka",
          styles: `${STYLES_KEY},`,
        },
        {
          _id: genId(),
          _type: "Textarea",
          _parent: parent,
          label: "Wiadomość",
          placeholder: "Opisz czego szukasz...",
          styles: `${STYLES_KEY},col-span-full`,
        },
        {
          _id: genId(),
          _type: "Button",
          _parent: parent,
          content: "Wyślij wiadomość",
          variant: "primary",
          styles: `${STYLES_KEY},col-span-full w-fit`,
        },
      ]);

    default:
      return [];
  }
}
