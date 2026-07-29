import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiBlockConfig, ChaiStyles } from "~/types/blocks";
import EmptySlot from "~/web-blocks/empty-slot";

export type BoxProps = {
  tag: string;
  backgroundImage: string;
  styles: ChaiStyles;
};

const Component = (props: ChaiBlockComponentProps<BoxProps>) => {
  const { blockProps, inBuilder, backgroundImage, children, tag = "div", styles } = props;
  let nestedChildren = children;
  if (!children) {
    nestedChildren = <EmptySlot inBuilder={inBuilder} />;
  }

  let cssStyles = {};
  if (backgroundImage) {
    cssStyles = { backgroundImage: `url(${backgroundImage})` };
  }

  return React.createElement(tag, { ...blockProps, ...styles, style: cssStyles }, nestedChildren);
};

const Config: ChaiBlockConfig = {
  type: "Box",
  description: "Similar to a div or section elements in HTML",
  label: "Box",
  category: "core",
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      tag: {
        type: "string",
        default: "div",
        title: "Tag",
        oneOf: [
          { const: "div", title: "div" },
          { const: "header", title: "header" },
          { const: "footer", title: "footer" },
          { const: "section", title: "section" },
          { const: "article", title: "article" },
          { const: "aside", title: "aside" },
          { const: "main", title: "main" },
          { const: "nav", title: "nav" },
          { const: "figure", title: "figure" },
          { const: "details", title: "details" },
          { const: "summary", title: "summary" },
          { const: "dialog", title: "dialog" },
          { const: "strike", title: "strike" },
          { const: "caption", title: "caption" },
          { const: "legend", title: "legend" },
          { const: "figcaption", title: "figcaption" },
          { const: "mark", title: "mark" },
        ],
      },
      backgroundImage: {
        type: "string",
        default: "",
        title: "Background Image",
        ui: { "ui:widget": "image", "ui:allowEmpty": true },
      },
    },
  }),
  canAcceptBlock: () => true,
};

export { Component, Config };
