import { ChaiBlockComponentProps } from "@chaibuilder/sdk/types";
import { first, isArray } from "lodash";
import Image from "next/image";
import * as React from "react";
import { ChaiBlockStyles } from "../types";

export const ImageBlock = (
  props: ChaiBlockComponentProps<{
    height: string;
    width: string;
    alt: string;
    styles: ChaiBlockStyles;
    lazyLoading: boolean;
    image: string;
  }>,
): React.ReactElement => {
  const { image, styles, alt, height, width, lazyLoading } = props;

  // If width or height are missing/invalid, use fill mode
  const shouldUseFill = !width || !height || isNaN(parseInt(width)) || isNaN(parseInt(height));

  const imageElement = React.createElement(Image, {
    ...styles,
    src: isArray(image) ? first(image)?.trimEnd() : image?.trimEnd(),
    alt: alt || "",
    priority: !lazyLoading,
    fill: shouldUseFill,
    height: shouldUseFill ? undefined : parseInt(height),
    width: shouldUseFill ? undefined : parseInt(width),
    style: shouldUseFill ? { objectFit: "cover" } : undefined,
    unoptimized: true, // Disable Next.js image optimization to avoid issues with external URLs
  });

  if (shouldUseFill) {
    return React.createElement("div", { className: "relative flex w-full h-full" }, imageElement);
  }

  return imageElement;
};
