import { ChaiBlockComponentProps, ChaiStyles } from "@chaibuilder/sdk/types";
import Link from "next/link";
import * as React from "react";
import { ChaiBuilder } from "../ChaiBuilder";

type LinkProps = {
  styles: ChaiStyles;
  content: string;
  link: {
    type: "page" | "pageType" | "url" | "email" | "telephone" | "element";
    target: "_self" | "_blank";
    href: string;
  };
  prefetchLink?: boolean;
};

const formatTelephoneLink = (href: string) => {
  return href.replace(/[^\d]/g, "");
};

export const LinkBlock = async (props: ChaiBlockComponentProps<LinkProps>) => {
  const { link, styles, children, content, prefetchLink, lang } = props;
  const isPageTypeLink = link?.type === "pageType" && link?.href !== "";
  let href = link?.type === "telephone" ? `tel:${formatTelephoneLink(link?.href)}` : link?.href;
  if (isPageTypeLink) {
    href = await ChaiBuilder.resolvePageLink(href, lang);
  }
  if (children) {
    return (
      <Link
        href={href || "#/"}
        target={link?.target}
        aria-label={content}
        {...styles}
        {...(prefetchLink ? { prefetch: true } : {})}>
        {children}
      </Link>
    );
  }

  return React.createElement(
    Link,
    {
      ...styles,
      href: href,
      target: link?.target || "_self",
      "aria-label": content,
      ...(prefetchLink ? { prefetch: true } : {}),
    },
    content,
  );
};

export const LinkConfig = {
  type: "Link",
  label: "Link",
  group: "basic",
  schema: {
    properties: {
      link: {
        type: "object",
        title: "Link",
      },
      prefetchLink: {
        type: "boolean",
        default: false,
        title: "Prefetch Link",
      },
    },
  },
  i18nProps: ["content"],
};
