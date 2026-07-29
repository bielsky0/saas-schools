import { builderProp, closestBlockProp, registerChaiBlockProps, StylesProp } from "~/runtime";
import { ChaiBlockComponentProps, ChaiBlockConfig, ChaiStyles } from "~/types/blocks";

type Sort = {
  field: string;
  order: string;
};

export type CollectionListProps = {
  title1: string;
  sort: Sort[];
  tag: string;
  showTitle: boolean;
  wrapperStyles: ChaiStyles;
  listStyles: ChaiStyles;
  itemStyles: ChaiStyles;
  binding: string;
  keyName: string;
  depsName: string;
  newName?: string;
};

type ServerProps = {
  items: Record<string, unknown>[];
};

const Component = (props: ChaiBlockComponentProps<CollectionListProps & ServerProps, Record<string, unknown>>) => {
  const { title1, blockProps, newName, wrapperStyles, listStyles, itemStyles, items, showTitle } = props;
  return (
    <div {...blockProps} {...wrapperStyles}>
      {showTitle && <h1>{title1}</h1>}
      <p>new name:{newName}</p>
      <div {...listStyles}>
        {items?.map((item: Record<string, any>) => (
          <div key={item._id} {...itemStyles}>
            {JSON.stringify(item)}
          </div>
        ))}
      </div>
    </div>
  );
};

const Config: ChaiBlockConfig = {
  type: "CollectionList",
  label: "Collection List",
  category: "core",
  dataProvider: () => {
    return { newName: "New Name " + Math.random() };
  },
  dataProviderMode: "live" as const,
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      tag: closestBlockProp("Box", "tag"),
      showTitle: builderProp({
        type: "boolean",
        title: "Show Title",
        default: true,
      }),
      title1: {
        type: "string",
        title: "Title",
        default: "Collection List 111",
      },
      wrapperStyles: StylesProp("bg-green-100 p-2 border border-red-500"),
      listStyles: StylesProp("text-blue-300 bg-blue-100"),
      itemStyles: StylesProp("text-green-500 bg-red-400"),
    },
  }),
  i18nProps: ["sort", "title"],
};

export { Component, Config };
