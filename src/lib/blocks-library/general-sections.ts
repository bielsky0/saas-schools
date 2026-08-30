import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

type GeneralTemplate = {
  id: string;
  name: string;
  group: string;
  description: string;
  preview: string;
};

export const generalTemplates: GeneralTemplate[] = [
  {
    id: "general-hero",
    name: "Hero — Uniwersalny",
    group: "Ogólne",
    description: "Sekcja hero z tytułem, opisem i CTA",
    preview: "",
  },
  {
    id: "general-features",
    name: "Funkcje / Korzyści",
    group: "Ogólne",
    description: "Siatka 3 ikon z opisami",
    preview: "",
  },
  {
    id: "general-testimonials",
    name: "Opinie klientów",
    group: "Ogólne",
    description: "Karty z opiniami klientów",
    preview: "",
  },
  {
    id: "general-faq",
    name: "FAQ",
    group: "Ogólne",
    description: "Lista pytań i odpowiedzi",
    preview: "",
  },
  {
    id: "general-cta",
    name: "Call to Action",
    group: "Ogólne",
    description: "Sekcja z przyciskiem i krótkim opisem",
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

export function generalBlocks(templateId: string): ChaiBlock[] {
  switch (templateId) {
    case "general-hero":
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
          content: "Twój nagłówek tutaj",
          styles: `${STYLES_KEY},text-4xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Krótki opis tego, co oferujesz. Przekonaj odwiedzających, że warto zostać.",
          styles: `${STYLES_KEY},text-lg text-muted-foreground max-w-2xl mx-auto`,
        },
        {
          _id: genId(),
          _type: "BookingButton",
          _parent: parent,
          groupTypeSlug: "",
          label: "Dowiedz się więcej",
          variant: "primary",
          styles: `${STYLES_KEY},self-center`,
        },
      ]);

    case "general-features":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Dlaczego my?",
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
          icon: "Star",
          styles: `${STYLES_KEY},h-10 w-10 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Jakość",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Dbamy o najwyższy standard usług i satysfakcję klientów",
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
          icon: "Clock",
          styles: `${STYLES_KEY},h-10 w-10 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Elastyczność",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Dostosowujemy się do Twojego grafika i potrzeb",
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
          icon: "Users",
          styles: `${STYLES_KEY},h-10 w-10 text-primary`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Społeczność",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Dołącz do grupy ludzi o wspólnych zainteresowaniach",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    case "general-testimonials":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Opinie naszych klientów",
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
          content: "\u201E\u015Awietna atmosfera i profesjonalne podej\u015Bcie. Polecam ka\u017Cdemu!\u201D",
          styles: `${STYLES_KEY},italic text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "— Klient 1",
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
          content: "\u201EJestem zadowolony z efekt\u00F3w. Na pewno wr\u00F3c\u0119!\u201D",
          styles: `${STYLES_KEY},italic text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "— Klient 2",
          styles: `${STYLES_KEY},font-semibold text-sm`,
        },
      ]);

    case "general-faq":
      return buildBlocks((parent) => [
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h2",
          content: "Najczęściej zadawane pytania",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},flex flex-col gap-4`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Jak zapisać się na zajęcia?",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Wystarczy klikn\u0105\u0107 przycisk \u201EZapisz si\u0119\u201D i wype\u0142ni\u0107 formularz. Skontaktujemy si\u0119 z Tob\u0105 w ci\u0105gu 24 godzin.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Czy mogę odwołać rezerwację?",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Tak, możesz odwołać rezerwację do 24 godzin przed planowanymi zajęciami bez żadnych konsekwencji.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
        {
          _id: genId(),
          _type: "Box",
          _parent: parent,
          styles: `${STYLES_KEY},rounded-lg border border-border p-4`,
        },
        {
          _id: genId(),
          _type: "Heading",
          _parent: parent,
          tag: "h3",
          content: "Jakie są metody płatności?",
          styles: `${STYLES_KEY},font-semibold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Akceptujemy płatności online (kartą, Blikiem, przelewem) oraz gotówką na miejscu.",
          styles: `${STYLES_KEY},text-sm text-muted-foreground`,
        },
      ]);

    case "general-cta":
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
          content: "Gotowy, żeby zacząć?",
          styles: `${STYLES_KEY},text-2xl font-bold`,
        },
        {
          _id: genId(),
          _type: "Paragraph",
          _parent: parent,
          content: "Dołącz do nas już dziś i przekonaj się, jak możemy Ci pomóc.",
          styles: `${STYLES_KEY},text-muted-foreground`,
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

    default:
      return [];
  }
}
