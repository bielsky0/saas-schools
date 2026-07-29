import { createElement } from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type LineBreakProps = {
  styles: ChaiStyles;
};

const LineBreakBlock = (props: ChaiBlockComponentProps<LineBreakProps>) => {
  const { blockProps, styles } = props;

  return createElement("br", { ...blockProps, ...styles });
};

const Config = {
  type: "LineBreak",
  label: "Line Break",
  category: "core",
  group: "basic",
  hidden: true,
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
    },
  }),
  canAcceptBlock: () => true,
  canDelete: () => false,
  canMove: () => false,
  canDuplicate: () => false,
};

export { LineBreakBlock as Component, Config };
