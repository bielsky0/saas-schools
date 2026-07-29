import { CodeIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

const CustomHTMLBlock = (props: ChaiBlockComponentProps<{ htmlCode: string; styles: ChaiStyles }>) => {
  const { blockProps, styles, htmlCode, inBuilder } = props;

  return inBuilder ? (
    <div className={"relative"} {...blockProps}>
      {inBuilder ? <div {...styles} className="absolute z-20 h-full w-full" /> : null}
      {React.createElement("div", {
        ...styles,
        dangerouslySetInnerHTML: { __html: htmlCode.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "") },
      })}
    </div>
  ) : (
    React.createElement("div", {
      ...blockProps,
      ...styles,
      dangerouslySetInnerHTML: { __html: htmlCode.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "") },
    })
  );
};

const Config = {
  type: "CustomHTML",
  description: "similar to a div or section elements in HTML",
  label: "Custom HTML",
  category: "core",
  icon: CodeIcon,
  group: "advanced",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      htmlCode: {
        type: "string",
        default: "<div><p>Enter your HTML code here...</p></div>",
        ui: { "ui:widget": "code" },
      },
    },
  }),
  i18nProps: ["htmlCode"],
};

export { CustomHTMLBlock as Component, Config };
export type CustomHTMLBlockProps = { htmlCode: string; styles: ChaiStyles };
