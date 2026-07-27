import type { Block } from "payload";

import { buttonSizeClass, buttonVariantClass } from "./style-dictionary";

export const buttonBlock: Block = {
  slug: "button",
  admin: { group: "Treść" },
  fields: [
    {
      name: "label",
      type: "text",
      required: true,
    },
    {
      name: "href",
      type: "text",
      required: true,
    },
    {
      name: "variant",
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Outline", value: "outline" },
      ],
      defaultValue: "primary",
    },
    {
      name: "size",
      type: "select",
      options: [
        { label: "Small", value: "small" },
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
      ],
      defaultValue: "medium",
    },
  ],
};

type ButtonBlockProps = {
  label: string;
  href: string;
  variant?: string;
  size?: string;
};

export function ButtonBlock({ label, href, variant, size }: ButtonBlockProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${buttonVariantClass(variant ?? "primary")} ${buttonSizeClass(size ?? "medium")}`}
    >
      {label}
    </a>
  );
}


