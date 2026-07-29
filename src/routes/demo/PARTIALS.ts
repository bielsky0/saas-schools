export const PARTIALS: Record<string, any> = {
  partial: [
    {
      _type: "Box",
      _id: "header",
      tag: "div",
      styles: "#styles:,flex flex-col items-center justify-center h-96",
    },
    {
      _type: "Span",
      content: "Span 2",
      _id: "span",
      _parent: "header",
      styles: "#styles:,text-center text-3xl font-bold p-4 bg-gray-100",
    },
    {
      _type: "Heading",
      content: "Heading 1",
      _id: "heading_1",
      _parent: "header",
      styles: "#styles:,text-center text-3xl font-bold p-4 bg-gray-100",
    },
  ],
  header: [
    {
      styles: "#styles:,flex w-full max-w-full overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800",
      tag: "div",
      backgroundImage: "",
      _type: "Box",
      _id: "header_1",
      _name: "Box",
    },
    {
      _type: "Heading",
      content: "Heading",
      _id: "heading_2",
      _parent: "header_1",
      styles: "#styles:,text-center text-3xl font-bold p-4 bg-gray-100",
    },
  ],
  footer: [
    {
      styles: "#styles:,flex w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800",
      tag: "div",
      backgroundImage: "",
      _type: "Box",
      _id: "footer_1",
      _name: "Box",
    },
    {
      _type: "Heading",
      content: "Footer",
      _id: "footer_heading_1",
      _parent: "footer_1",
      styles: "#styles:,text-center text-3xl font-bold p-4 bg-gray-100",
    },
    {
      _type: "PartialBlock",
      _id: "partial_1",
      partialBlockId: "partial",
    },
  ],
};
