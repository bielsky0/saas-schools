import { LetterCaseToggleIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type LabelProps = {
  content: string;
  styles: ChaiStyles;
};

export const LabelBlock = (props: ChaiBlockComponentProps<LabelProps>) => {
  const { blockProps, content, styles, children } = props;
  const labelProps = { ...styles, ...blockProps };

  if (children) return React.createElement("label", labelProps, children);
  return React.createElement("label", {
    ...labelProps,
    dangerouslySetInnerHTML: { __html: content },
  });
};
const Config = {
  type: "Label",
  label: "Label",
  category: "core",
  icon: LetterCaseToggleIcon,
  group: "form",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(),
      content: {
        type: "string",
        title: "Content",
        default: "",
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
};

export { LabelBlock as Component, Config };
