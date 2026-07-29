import { DividerHorizontalIcon } from "@radix-ui/react-icons";
import { createElement } from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type DividerBlockProps = {
  styles: ChaiStyles;
};

const DividerBlock = (props: ChaiBlockComponentProps<DividerBlockProps>) => {
  const { blockProps, styles } = props;
  return createElement("hr", { ...styles, ...blockProps });
};

const Config = {
  type: "Divider",
  description: "A horizontal line component",
  label: "Divider",
  category: "core",
  icon: DividerHorizontalIcon,
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("bg-gray-900 h-0.5 py-2 my-1"),
    },
  }),
};

export { DividerBlock as Component, Config };
