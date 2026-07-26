import type { Block } from "payload";

export const accordionBlock: Block = {
  slug: "accordion",
  fields: [
    {
      name: "items",
      type: "array",
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
        },
        {
          name: "content",
          type: "richText",
          required: true,
        },
      ],
    },
  ],
};

type AccordionItem = {
  title: string;
  content: unknown;
};

type AccordionBlockProps = {
  items?: AccordionItem[];
  RenderLexical: (data: unknown) => React.ReactNode;
};

export function AccordionBlock({ items, RenderLexical }: AccordionBlockProps) {
  if (!items?.length) return null;

  return (
    <div className="divide-y rounded-md border">
      {items.map((item, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-medium hover:bg-muted/50">
            {item.title}
            <svg
              className="size-4 transition-transform group-open:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="prose prose-sm max-w-none px-4 pb-3 dark:prose-invert">
            {RenderLexical(item.content)}
          </div>
        </details>
      ))}
    </div>
  );
}


