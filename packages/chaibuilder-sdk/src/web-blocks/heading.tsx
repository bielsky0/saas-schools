import { HeadingIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type HeadingProps = {
  tag: string;
  styles: ChaiStyles;
  content: string;
};

const HeadingBlock = (props: ChaiBlockComponentProps<HeadingProps>) => {
  const { blockProps, styles, content, tag = "h1", children = null } = props;

  if (children) return React.createElement(tag, { ...styles, ...blockProps }, children);

  return React.createElement(tag, {
    ...styles,
    ...blockProps,
    dangerouslySetInnerHTML: { __html: content },
  });
};

const Config = {
  type: "Heading",
  description: "A heading component similar to h1, h2, h3, h4, h5, h6 elements in HTML",
  label: "Heading",
  category: "core",
  icon: HeadingIcon,
  group: "typography",
  props: registerChaiBlockProps({
    properties: {
      tag: {
        type: "string",
        default: "h2",
        title: "Level",
        enum: ["h1", "h2", "h3", "h4", "h5", "h6"],
      },
      styles: stylesProp("text-3xl"),
      content: {
        type: "string",
        default: "Heading goes here",
        title: "Content",
        ui: { "ui:widget": "textarea", "ui:rows": 3 },
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
  canAcceptBlock: () => true,
};

export { HeadingBlock as Component, Config };
