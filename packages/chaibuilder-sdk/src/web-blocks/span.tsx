import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type SpanProps = {
  styles: ChaiStyles;
  content: string;
  tag: string;
};

const SpanBlock = (props: ChaiBlockComponentProps<SpanProps>) => {
  const { blockProps, styles, content, children = null, tag } = props;

  if (children) return React.createElement("span", { ...styles, ...blockProps }, children);

  return React.createElement(tag || "span", {
    ...styles,
    ...blockProps,
    dangerouslySetInnerHTML: { __html: (content || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "") },
  });
};

const Config = {
  type: "Span",
  description: "A span component",
  label: "Span",
  category: "core",
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      content: {
        type: "string",
        title: "Content",
        default: "",
        ui: { "ui:widget": "textarea", "ui:autosize": true, "ui:rows": 3 },
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
  canAcceptBlock: () => true,
};

export { SpanBlock as Component, Config };
