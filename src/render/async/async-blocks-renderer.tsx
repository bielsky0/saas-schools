import { filter, get, has, isArray, isEmpty, map, uniqBy } from "lodash-es";
import { adjustSpacingInContentBlocks } from "~/core/components/canvas/static/adjust-spacing-in-blocks";
import { RenderChaiBlocksProps } from "~/render/render-chai-blocks";
import { AsyncRenderBlock } from "./async-block-renderer";

export const AsyncRenderBlocks = async (
  props: RenderChaiBlocksProps & { repeaterData?: { index: number; dataKey: string }; type?: string } & {
    dataProviders: Record<string, Promise<Record<string, any>>>;
  },
) => {
  const { blocks, parent, repeaterData, type } = props;
  let filteredBlocks = uniqBy(
    filter(blocks, (block) => has(block, "_id") && (!isEmpty(parent) ? block._parent === parent : !block._parent)),
    "_id",
  );
  const hasChildren = (blockId: string) => filter(blocks, (b) => b._parent === blockId).length > 0;

  if (type === "Heading" || type === "Paragraph" || type === "Link") {
    filteredBlocks = adjustSpacingInContentBlocks(filteredBlocks);
  }

  return map(filteredBlocks, (block) => {
    if (!block) return null;
    return (
      <AsyncRenderBlock {...props} dataProviders={props.dataProviders} key={block._id} block={block}>
        {({ _id, _type, repeaterItems, $repeaterItemsKey }) => {
          return _type === "Repeater" ? (
            isArray(repeaterItems) &&
              repeaterItems.map((_, index) => (
                <AsyncRenderBlocks
                  {...props}
                  parent={block._id}
                  key={`${get(block, "_parent", "root")}-${block._id}-${index}`}
                  repeaterData={{ index, dataKey: $repeaterItemsKey! }}
                />
              ))
          ) : hasChildren(_id) ? (
            <AsyncRenderBlocks
              {...props}
              parent={block._id}
              key={`${get(block, "_parent", "root")}-${block._id}`}
              repeaterData={repeaterData}
              type={block._type}
            />
          ) : null;
        }}
      </AsyncRenderBlock>
    );
  });
};
