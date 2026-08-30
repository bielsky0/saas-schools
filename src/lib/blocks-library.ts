import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import { swimmingTemplates, swimmingBlocks } from "./blocks-library/swimming-sections";
import { schoolTemplates, schoolBlocks } from "./blocks-library/school-sections";
import { danceTemplates, danceBlocks } from "./blocks-library/dance-sections";
import { generalTemplates, generalBlocks } from "./blocks-library/general-sections";

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
  {
    id: "blog-hero",
    name: "Hero wpisu",
    group: "Blog",
    description: "Nagłówek wpisu z tytułem, obrazem tła i metadanymi (autor, data)",
    preview: "",
  },
  {
    id: "blog-quote",
    name: "Cytat",
    group: "Blog",
    description: "Wyróżniony cytat z autorem",
    preview: "",
  },
  {
    id: "blog-gallery",
    name: "Galeria",
    group: "Blog",
    description: "Siatka obrazów w 2-3 kolumnach",
    preview: "",
  },
  {
    id: "blog-table",
    name: "Tabela porównawcza",
    group: "Blog",
    description: "Tabela z danymi w 2 kolumnach",
    preview: "",
  },
  {
    id: "blog-author",
    name: "Autor",
    group: "Blog",
    description: "Karta autora wpisu ze zdjęciem, imieniem i bio",
    preview: "",
  },
  ...swimmingTemplates,
  ...schoolTemplates,
  ...danceTemplates,
  ...generalTemplates,
  {
    id: "page-404-hero",
    name: "Hero — 404",
    group: "Systemowe",
    description: "Sekcja hero dla strony 404 z informacją o nieistnieniu strony",
    preview: "",
  },
  {
    id: "enrollment-listing-hero",
    name: "Hero — Lista zapisów",
    group: "Systemowe",
    description: "Sekcja hero dla listy zapisów z tytułem i opisem",
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

    case "blog-hero":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Obraz tła",
          styles: `${STYLES_KEY},w-full h-64 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h1",
          content: "Tytuł wpisu",
          styles: `${STYLES_KEY},text-4xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Autor · 1 stycznia 2025 · 5 min czytania",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    case "blog-quote":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "blockquote",
          styles: `${STYLES_KEY},border-l-4 border-primary pl-6 py-4 my-6`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "p",
          content: "Treść cytatu — inspirujące zdanie lub myśl autora.",
          styles: `${STYLES_KEY},text-xl italic font-medium`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "— Autor cytatu",
          styles: `${STYLES_KEY},mt-2 text-sm text-muted-foreground`,
        },
      ]);

    case "blog-gallery":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Galeria",
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
          alt: "Zdjęcie 1",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zdjęcie 2",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zdjęcie 3",
          styles: `${STYLES_KEY},w-full h-48 object-cover rounded-lg`,
        },
      ]);

    case "blog-table":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Porównanie",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},overflow-x-auto`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "table",
          styles: `${STYLES_KEY},w-full border-collapse`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "thead",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "tr",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "th",
          content: "Cecha",
          styles: `${STYLES_KEY},border border-border p-2 text-left font-semibold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "th",
          content: "Wartość",
          styles: `${STYLES_KEY},border border-border p-2 text-left font-semibold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "tbody",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "tr",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "Cena",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "299 zł",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "tr",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "Czas trwania",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "60 min",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "tr",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "Poziom",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "Średniozaawansowany",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "tr",
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "Terminy",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          tag: "td",
          content: "Poniedziałek 18:00",
          styles: `${STYLES_KEY},border border-border p-2`,
        },
      ]);

    case "blog-author":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex items-center gap-4 rounded-lg border border-border p-4`,
        },
        {
          _id: genId(),
          _type: "ImageBlock",
          _parent: parent,
          src: "",
          alt: "Zdjęcie autora",
          styles: `${STYLES_KEY},h-16 w-16 rounded-full object-cover`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex flex-col`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Imię Nazwisko",
          styles: `${STYLES_KEY},text-lg font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Krótkie bio autora — kilka zdań o doświadczeniu i specjalizacji.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    default:
      return swimmingBlocks(templateId)
        || schoolBlocks(templateId)
        || danceBlocks(templateId)
        || generalBlocks(templateId)
        || pageBlocks(templateId)
        || [];
  }
}

function pageBlocks(templateId: string): ChaiBlock[] | null {
  switch (templateId) {
    case "page-404-hero":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},text-center py-24 px-6`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h1",
          content: "404",
          styles: `${STYLES_KEY},text-8xl font-bold text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Strona nie znaleziona",
          styles: `${STYLES_KEY},text-2xl font-semibold mt-4`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Strona, której szukasz, nie istnieje lub została przeniesiona.",
          styles: `${STYLES_KEY},text-muted-foreground mt-2`,
        },
        {
          _id: genId(),
          _type: "Button",
          _parent: parent,
          content: "Wróć do strony głównej",
          variant: "primary",
          href: "/",
          styles: `${STYLES_KEY},mt-8`,
        },
      ]);

    case "enrollment-listing-hero":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},text-center py-16 px-6`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h1",
          content: "Nasza oferta",
          styles: `${STYLES_KEY},text-4xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Wybierz zajęcia dopasowane do Twoich potrzeb i zapisz się online",
          styles: `${STYLES_KEY},text-lg text-muted-foreground`,
        },
      ]);

    default:
      return null;
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
