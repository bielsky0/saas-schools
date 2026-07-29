import { LoopIcon } from "@radix-ui/react-icons";
import { isEmpty, pick } from "lodash-es";
import * as React from "react";
import { closestBlockProp, registerChaiBlockProps, stylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiBlockConfig, ChaiStyles } from "~/types/blocks";
import { PaginationWrapper } from "./pagination-wrapper";

export type RepeaterProps = {
  children?: React.ReactNode;
  tag: string;
  styles: ChaiStyles;
  paginationStyles: ChaiStyles;
  pagination: boolean;
  paginationStrategy: "query" | "segment";
  limit: number;
  totalItems?: number;
  repeaterItems?: any[];
};

export const Repeater = (props: ChaiBlockComponentProps<RepeaterProps>) => {
  const { children, tag, styles, blockProps, $loading } = props;
  const { pagination, inBuilder } = props;
  let items = children;
  if (isEmpty(items) && inBuilder) {
    items = (
      <div className="col-span-3 flex items-center justify-center bg-orange-50 p-5 text-sm text-muted-foreground">
        Choose a collection to display items
      </div>
    );
  }

  if (tag === "none") {
    return $loading && inBuilder
      ? Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-md bg-primary/10 p-5">
            <div className="h-6 w-1/2 rounded-md bg-primary/10"></div>
            <div className="mt-2 h-4 w-1/2 rounded-md bg-primary/10"></div>
          </div>
        ))
      : items;
  }
  return (
    <>
      {React.createElement(
        tag,
        { ...blockProps, ...styles },
        $loading && inBuilder
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-md bg-primary/10 p-5">
                <div className="h-6 w-1/2 rounded-md bg-primary/10"></div>
                <div className="mt-2 h-4 w-1/2 rounded-md bg-primary/10"></div>
              </div>
            ))
          : items,
      )}
      {pagination && (
        <PaginationWrapper
          {...pick(props, [
            "limit",
            "totalItems",
            "paginationStrategy",
            "inBuilder",
            "draft",
            "lang",
            "paginationStyles",
          ])}
        />
      )}
    </>
  );
};

export const RepeaterConfig: Omit<ChaiBlockConfig, "component"> = {
  type: "Repeater",
  label: "Repeater",
  icon: LoopIcon,
  group: "basic",
  description: "Repeater block is used to display a list of items based on data binding in repeaterItems",
  dataProviderMode: "live",
  dataProviderDependencies: ["filter", "sort", "limit", "repeaterItems"],
  blocks: () => [
    { _id: "A", _type: "Repeater", tag: "ul" },
    { _id: "B", _name: "Repeater Item", _type: "RepeaterItem", parentTag: "ul", _parent: "A" },
  ],
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("grid gap-4 md:grid-cols-2 xl:grid-cols-3"),
      paginationStyles: stylesProp("flex items-center justify-center gap-2 p-4"),
      repeaterItems: {
        title: "Collection",
        type: "string",
        binding: "array",
        default: "",
        ui: {
          "ui:widget": "repeaterBinding",
          "ui:readonly": true,
        },
      },
      tag: {
        title: "Tag",
        type: "string",
        default: "ul",
        enum: ["none", "div", "ul", "ol"],
      },
      filter: {
        title: "Filter by",
        type: "string",
        default: "",
        ui: { "ui:widget": "collectionSelect" },
      },
      sort: {
        title: "Sort by",
        type: "string",
        default: "",
        ui: { "ui:widget": "collectionSelect" },
      },
      pagination: {
        title: "Pagination",
        type: "boolean",
        default: false,
      },
    },
    allOf: [
      {
        if: {
          properties: {
            pagination: { const: true },
          },
        },
        then: {
          properties: {
            paginationStrategy: {
              type: "string",
              title: "Pagination Strategy",
              default: "segment",
              enum: ["query", "segment"],
            },
            limit: {
              type: "number",
              title: "Items Per Page",
              default: 10,
              minimum: 1,
            },
          },
        },
      },
      {
        if: {
          properties: {
            pagination: { const: false },
          },
        },
        then: {
          properties: {
            limit: {
              type: "number",
              title: "Max items",
              default: 10,
              minimum: 1,
            },
          },
        },
      },
    ],
  }),
  canAcceptBlock: (type: string) => type === "Pagination",
};

export type RepeaterItemProps = {
  parentTag: string;
  styles: ChaiStyles;
};

export const RepeaterItem = ({
  children,
  blockProps,
  styles,
  parentTag,
  inBuilder,
}: ChaiBlockComponentProps<RepeaterItemProps>) => {
  let tag = "li";
  switch (parentTag) {
    case "ul":
      tag = "li";
      break;
    case "ol":
      tag = "li";
      break;
    default:
      tag = "div";
  }
  if (!children && inBuilder) {
    return React.createElement(
      tag,
      { ...blockProps, ...styles },
      <div className="col-span-3 flex items-center justify-center bg-orange-50 p-5 text-sm text-muted-foreground">
        Add children to repeater item
      </div>,
    );
  }
  return React.createElement(tag, { ...blockProps, ...styles }, children);
};

export const RepeaterItemConfig: Omit<ChaiBlockConfig, "component"> = {
  type: "RepeaterItem",
  label: "Repeater Item",
  icon: LoopIcon,
  hidden: true,
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      parentTag: closestBlockProp("Repeater", "tag"),
    },
  }),
  canAcceptBlock: (type: string) => type !== "RepeaterItem",
  canDelete: () => false,
  canMove: () => false,
  canDuplicate: () => false,
};

export type RepeaterEmptyStateProps = {
  styles: ChaiStyles;
};

export const RepeaterEmptyState = ({
  children,
  blockProps,
  styles,
}: ChaiBlockComponentProps<RepeaterEmptyStateProps>) => {
  return React.createElement("div", { ...blockProps, ...styles }, children);
};

export const RepeaterEmptyStateConfig: Omit<ChaiBlockConfig, "component"> = {
  type: "RepeaterEmptyState",
  label: "Empty State",
  hidden: true,
  group: "basic",
  props: registerChaiBlockProps({
    properties: { styles: stylesProp("p-5 flex items-center justify-center") },
  }),
  canAcceptBlock: () => true,
  canDelete: () => false,
  canMove: () => false,
  canDuplicate: () => false,
};
