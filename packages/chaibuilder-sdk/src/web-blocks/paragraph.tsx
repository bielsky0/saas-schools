import { TextIcon } from "@radix-ui/react-icons";
import { isNull } from "lodash-es";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import { addForcedClasses } from "./helper";

export type ParagraphProps = {
  styles: ChaiStyles;
  content: string;
};

const ParagraphBlock = (props: ChaiBlockComponentProps<ParagraphProps>) => {
  const { blockProps, styles, content } = props;

  if (!isNull(props.children)) return React.createElement("p", { ...styles, ...blockProps }, props.children);

  const forcedStyles = addForcedClasses(styles, "rte");

  return React.createElement("div", {
    ...forcedStyles,
    ...blockProps,
    dangerouslySetInnerHTML: { __html: content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "") },
  });
};

const Config = {
  type: "Paragraph",
  description: "A paragraph component",
  label: "Paragraph",
  category: "core",
  icon: TextIcon,
  group: "typography",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      content: {
        type: "string",
        title: "Content",
        default: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat. Aenean faucibus nibh et justo cursus id rutrum lorem imperdiet. Nunc ut sem vitae risus tristique posuere.`,
        ui: { "ui:widget": "richtext", "ui:autosize": true, "ui:rows": 5 },
      },
    },
  }),
  i18nProps: ["content"],
  aiProps: ["content"],
  canAcceptBlock: (type: string) => type === "Span" || type === "Link" || type === "Text",
};

export { ParagraphBlock as Component, Config };
