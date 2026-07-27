import type { Block } from "payload";

import { CMS_LEXICAL_EDITOR } from "../lexical-editor"

export const textBlock = {
  slug: "text",
  admin: {
    group: "Treść",
    components: {
      Label: "/src/features/cms/admin/block-row-label#RowLabel",
    },
  },
  fields: [
    {
      name: "content",
      type: "richText",
      required: true,
      editor: CMS_LEXICAL_EDITOR,
    },
  ],
} as Block;

type TextBlockProps = {
  content: unknown;
  RenderLexical: (data: unknown) => React.ReactNode;
};

export function TextBlock({ content, RenderLexical }: TextBlockProps) {
  if (!content) return null;
  return <div className="prose prose-sm max-w-none dark:prose-invert">{RenderLexical(content)}</div>;
}


