import type { Block } from "payload";

import { CMS_LEXICAL_EDITOR } from "../lexical-editor"

export const textBlock: Block = {
  slug: "text",
  admin: { group: "Treść" },
  fields: [
    {
      name: "content",
      type: "richText",
      required: true,
      editor: CMS_LEXICAL_EDITOR,
    },
  ],
};

type TextBlockProps = {
  content: unknown;
  RenderLexical: (data: unknown) => React.ReactNode;
};

export function TextBlock({ content, RenderLexical }: TextBlockProps) {
  if (!content) return null;
  return <div className="prose prose-sm max-w-none dark:prose-invert">{RenderLexical(content)}</div>;
}


